-- Mirror tables for outbox push (v1) — sites + generic ingest log
-- Apply after 001_profiles.sql

create table if not exists public.sites (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  name text not null,
  locality text not null default '',
  cooperative_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);

create index if not exists idx_sites_account on public.sites (account_id);

alter table public.sites enable row level security;

drop policy if exists "sites_own" on public.sites;
create policy "sites_own"
  on public.sites for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create table if not exists public.planteurs (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  site_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);

create index if not exists idx_planteurs_account on public.planteurs (account_id);

alter table public.planteurs enable row level security;

drop policy if exists "planteurs_own" on public.planteurs;
create policy "planteurs_own"
  on public.planteurs for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create table if not exists public.survey_responses_remote (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  site_id text,
  template_key text not null,
  template_version text not null,
  business_status text not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);

alter table public.survey_responses_remote enable row level security;

drop policy if exists "survey_responses_own" on public.survey_responses_remote;
create policy "survey_responses_own"
  on public.survey_responses_remote for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

-- Catch-all for entity types without a dedicated mirror yet
create table if not exists public.outbox_ingest (
  id text primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  operation text not null,
  payload jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  received_at timestamptz not null default now()
);

alter table public.outbox_ingest enable row level security;

drop policy if exists "outbox_ingest_own" on public.outbox_ingest;
create policy "outbox_ingest_own"
  on public.outbox_ingest for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);
