-- Survey campaigns, created by the cooperative admin (name + start/end dates).
-- Household, education and annual surveys restart for every campaign.
-- Also exposes response identity columns so server rows are usable
-- (template_key used to arrive as 'unknown', target only inside payload).

create table if not exists public.campaigns (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active',
  payload jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_dates check (ends_on >= starts_on),
  constraint campaigns_status check (status in ('active', 'closed'))
);

create index if not exists idx_campaigns_coop_cursor on public.campaigns (cooperative_id, updated_at, id);

alter table public.campaigns enable row level security;

drop trigger if exists guard_mirror_write on public.campaigns;
create trigger guard_mirror_write before insert or update on public.campaigns
  for each row execute function public.guard_mirror_write();

drop policy if exists "campaigns_select" on public.campaigns;
create policy "campaigns_select" on public.campaigns for select
  using (cooperative_id = public.my_cooperative_id());

drop policy if exists "campaigns_insert" on public.campaigns;
create policy "campaigns_insert" on public.campaigns for insert
  with check (
    cooperative_id = public.my_cooperative_id()
    and account_id = auth.uid()
    and public.is_admin()
  );

drop policy if exists "campaigns_update" on public.campaigns;
create policy "campaigns_update" on public.campaigns for update
  using (cooperative_id = public.my_cooperative_id() and public.is_admin())
  with check (cooperative_id = public.my_cooperative_id());

drop policy if exists "campaigns_delete" on public.campaigns;
create policy "campaigns_delete" on public.campaigns for delete
  using (cooperative_id = public.my_cooperative_id() and public.is_admin());

-- Response identity, filled from the local row on push.
alter table public.survey_responses_remote
  add column if not exists campaign_id text,
  add column if not exists target_type text,
  add column if not exists target_id text,
  add column if not exists current_step integer;

create index if not exists idx_survey_remote_target
  on public.survey_responses_remote (cooperative_id, target_id, template_key);
create index if not exists idx_survey_remote_campaign
  on public.survey_responses_remote (cooperative_id, campaign_id);
