-- Phase 0: shared cooperative_id tenancy for SCPB staff (admin + agents).
-- Cooperatives are NOT app users; cooperative_id is the org workspace scope.

create or replace function public.my_cooperative_id()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select nullif(trim(cooperative_id), '') from public.profiles where id = auth.uid()),
    'scpb-default'
  );
$$;

revoke all on function public.my_cooperative_id() from public;
grant execute on function public.my_cooperative_id() to authenticated;

-- Ensure every profile has an org scope
update public.profiles
set cooperative_id = 'scpb-default'
where cooperative_id is null or trim(cooperative_id) = '';

alter table public.profiles
  alter column cooperative_id set default 'scpb-default';

-- New users inherit org from metadata or default
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, cooperative_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'AGENT_TERRAIN'),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'cooperative_id'), ''),
      'scpb-default'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- --- sites ---
alter table public.sites add column if not exists cooperative_id text;
update public.sites s
set cooperative_id = coalesce(
  (select nullif(trim(p.cooperative_id), '') from public.profiles p where p.id = s.account_id),
  'scpb-default'
)
where s.cooperative_id is null or trim(s.cooperative_id) = '';
alter table public.sites alter column cooperative_id set default 'scpb-default';
alter table public.sites alter column cooperative_id set not null;
create index if not exists idx_sites_coop_updated on public.sites (cooperative_id, updated_at);

drop policy if exists "sites_own" on public.sites;
create policy "sites_coop_all"
  on public.sites for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

-- --- planteurs ---
alter table public.planteurs add column if not exists cooperative_id text;
update public.planteurs r
set cooperative_id = coalesce(
  (select nullif(trim(p.cooperative_id), '') from public.profiles p where p.id = r.account_id),
  'scpb-default'
)
where r.cooperative_id is null or trim(r.cooperative_id) = '';
alter table public.planteurs alter column cooperative_id set default 'scpb-default';
alter table public.planteurs alter column cooperative_id set not null;
create index if not exists idx_planteurs_coop_updated on public.planteurs (cooperative_id, updated_at);

drop policy if exists "planteurs_own" on public.planteurs;
create policy "planteurs_coop_all"
  on public.planteurs for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

-- --- survey_responses_remote ---
alter table public.survey_responses_remote add column if not exists cooperative_id text;
update public.survey_responses_remote r
set cooperative_id = coalesce(
  (select nullif(trim(p.cooperative_id), '') from public.profiles p where p.id = r.account_id),
  'scpb-default'
)
where r.cooperative_id is null or trim(r.cooperative_id) = '';
alter table public.survey_responses_remote alter column cooperative_id set default 'scpb-default';
alter table public.survey_responses_remote alter column cooperative_id set not null;
create index if not exists idx_survey_remote_coop_updated
  on public.survey_responses_remote (cooperative_id, updated_at);

drop policy if exists "survey_responses_own" on public.survey_responses_remote;
create policy "survey_responses_coop_all"
  on public.survey_responses_remote for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

-- --- outbox_ingest ---
alter table public.outbox_ingest add column if not exists cooperative_id text;
update public.outbox_ingest r
set cooperative_id = coalesce(
  (select nullif(trim(p.cooperative_id), '') from public.profiles p where p.id = r.account_id),
  'scpb-default'
)
where r.cooperative_id is null or trim(r.cooperative_id) = '';
alter table public.outbox_ingest alter column cooperative_id set default 'scpb-default';
alter table public.outbox_ingest alter column cooperative_id set not null;
create index if not exists idx_outbox_ingest_coop on public.outbox_ingest (cooperative_id, received_at);

drop policy if exists "outbox_ingest_own" on public.outbox_ingest;
create policy "outbox_ingest_coop_all"
  on public.outbox_ingest for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

-- Profiles: same-org staff can list colleagues (for agents KPI / user list)
drop policy if exists "profiles_coop_select" on public.profiles;
create policy "profiles_coop_select"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_admin()
    or cooperative_id = public.my_cooperative_id()
  );
