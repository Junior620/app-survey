-- Phase 1: domain mirrors for remaining OutboxEntityType values.
-- Payload-jsonb mirrors + cooperative_id RLS (shared org).

create or replace function public.stamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Domain mirrors (payload jsonb) + cooperative_id RLS

create table if not exists public.secteurs (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  site_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_secteurs_coop_updated on public.secteurs (cooperative_id, updated_at);
alter table public.secteurs enable row level security;
drop policy if exists "secteurs_coop_all" on public.secteurs;
create policy "secteurs_coop_all" on public.secteurs for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.villages (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_villages_coop_updated on public.villages (cooperative_id, updated_at);
alter table public.villages enable row level security;
drop policy if exists "villages_coop_all" on public.villages;
create policy "villages_coop_all" on public.villages for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.parcelles (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  site_id text,
  planteur_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_parcelles_coop_updated on public.parcelles (cooperative_id, updated_at);
alter table public.parcelles enable row level security;
drop policy if exists "parcelles_coop_all" on public.parcelles;
create policy "parcelles_coop_all" on public.parcelles for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.formations (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  site_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'planned',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_formations_coop_updated on public.formations (cooperative_id, updated_at);
alter table public.formations enable row level security;
drop policy if exists "formations_coop_all" on public.formations;
create policy "formations_coop_all" on public.formations for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.seances (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  formation_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'planned',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_seances_coop_updated on public.seances (cooperative_id, updated_at);
alter table public.seances enable row level security;
drop policy if exists "seances_coop_all" on public.seances;
create policy "seances_coop_all" on public.seances for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.participations (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  seance_id text,
  planteur_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_participations_coop_updated on public.participations (cooperative_id, updated_at);
alter table public.participations enable row level security;
drop policy if exists "participations_coop_all" on public.participations;
create policy "participations_coop_all" on public.participations for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.missions (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  site_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'todo',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_missions_coop_updated on public.missions (cooperative_id, updated_at);
alter table public.missions enable row level security;
drop policy if exists "missions_coop_all" on public.missions;
create policy "missions_coop_all" on public.missions for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.questionnaires_remote (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_questionnaires_remote_coop on public.questionnaires_remote (cooperative_id, updated_at);
alter table public.questionnaires_remote enable row level security;
drop policy if exists "questionnaires_remote_coop_all" on public.questionnaires_remote;
create policy "questionnaires_remote_coop_all" on public.questionnaires_remote for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.questionnaire_versions_remote (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  questionnaire_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_q_versions_remote_coop on public.questionnaire_versions_remote (cooperative_id, updated_at);
alter table public.questionnaire_versions_remote enable row level security;
drop policy if exists "q_versions_remote_coop_all" on public.questionnaire_versions_remote;
create policy "q_versions_remote_coop_all" on public.questionnaire_versions_remote for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.questionnaire_assignments_remote (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  questionnaire_id text,
  site_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_q_assign_remote_coop on public.questionnaire_assignments_remote (cooperative_id, updated_at);
alter table public.questionnaire_assignments_remote enable row level security;
drop policy if exists "q_assign_remote_coop_all" on public.questionnaire_assignments_remote;
create policy "q_assign_remote_coop_all" on public.questionnaire_assignments_remote for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.attachments_meta (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  entity_type text,
  entity_id text,
  storage_path text,
  relative_path text,
  mime_type text,
  byte_size bigint,
  access_level text not null default 'standard',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_attachments_meta_coop on public.attachments_meta (cooperative_id, updated_at);
alter table public.attachments_meta enable row level security;
drop policy if exists "attachments_meta_coop_all" on public.attachments_meta;
create policy "attachments_meta_coop_all" on public.attachments_meta for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

create table if not exists public.geometry_versions_remote (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  cooperative_id text not null default 'scpb-default',
  parcelle_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_geometry_remote_coop on public.geometry_versions_remote (cooperative_id, updated_at);
alter table public.geometry_versions_remote enable row level security;
drop policy if exists "geometry_remote_coop_all" on public.geometry_versions_remote;
create policy "geometry_remote_coop_all" on public.geometry_versions_remote for all
  using (cooperative_id = public.my_cooperative_id())
  with check (cooperative_id = public.my_cooperative_id());

-- Storage bucket for attachment blobs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "attachments_storage_select" on storage.objects;
create policy "attachments_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.my_cooperative_id()
  );

drop policy if exists "attachments_storage_insert" on storage.objects;
create policy "attachments_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.my_cooperative_id()
  );

drop policy if exists "attachments_storage_update" on storage.objects;
create policy "attachments_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.my_cooperative_id()
  );

drop policy if exists "attachments_storage_delete" on storage.objects;
create policy "attachments_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.my_cooperative_id()
  );
