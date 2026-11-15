-- Planter consent shared with the agents of the planter's site, without phone numbers.
-- Status, respondent name and decision are shared so a second agent does not ask again;
-- signature and photo travel through attachments_meta (site-scoped, migration 011).
-- Phone numbers keep going to outbox_ingest, readable only by their author and the
-- admin / sustainability / protection roles (migration 009).

create table if not exists public.survey_consents_remote (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null,
  site_id text,
  planteur_id text not null,
  questionnaire_id text not null,
  consent_version text not null,
  definition_id text not null,
  language text not null,
  status text not null,
  presented_confirmed boolean not null default false,
  respondent_name text,
  -- 'provided' / 'no_phone' / 'refused' only; the numbers are never stored here.
  respondent_phone_status text,
  other_household_phone_status text,
  agent_name_snapshot text,
  decided_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_survey_consents_remote_cursor
  on public.survey_consents_remote (cooperative_id, updated_at, id);
create index if not exists idx_survey_consents_remote_planteur
  on public.survey_consents_remote (cooperative_id, planteur_id);

alter table public.survey_consents_remote enable row level security;

drop trigger if exists guard_mirror_write on public.survey_consents_remote;
create trigger guard_mirror_write before insert or update on public.survey_consents_remote
  for each row execute function public.guard_mirror_write();

drop policy if exists "survey_consents_remote_select" on public.survey_consents_remote;
create policy "survey_consents_remote_select" on public.survey_consents_remote for select
  using (cooperative_id = public.my_cooperative_id() and public.can_see_site(site_id));

drop policy if exists "survey_consents_remote_insert" on public.survey_consents_remote;
create policy "survey_consents_remote_insert" on public.survey_consents_remote for insert
  with check (
    cooperative_id = public.my_cooperative_id()
    and account_id = auth.uid()
    and public.my_role() <> 'AUDITEUR'
    and public.can_see_site(site_id)
  );

drop policy if exists "survey_consents_remote_update" on public.survey_consents_remote;
create policy "survey_consents_remote_update" on public.survey_consents_remote for update
  using (
    cooperative_id = public.my_cooperative_id()
    and public.my_role() <> 'AUDITEUR'
    and public.can_see_site(site_id)
  )
  with check (cooperative_id = public.my_cooperative_id());

drop policy if exists "survey_consents_remote_delete" on public.survey_consents_remote;
create policy "survey_consents_remote_delete" on public.survey_consents_remote for delete
  using (cooperative_id = public.my_cooperative_id() and public.is_admin());

-- Guard against phone columns being added here by mistake later.
comment on table public.survey_consents_remote is
  'Shared planter consent. Never store respondent or household phone numbers here.';
