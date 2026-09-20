-- Expose planter identity as real columns (not only inside payload jsonb).
-- Table editor / SQL can then show code, nom, prenoms without opening JSON.

alter table public.planteurs
  add column if not exists code text,
  add column if not exists nom text,
  add column if not exists prenoms text,
  add column if not exists telephone text;

-- Backfill from existing payload jsonb
update public.planteurs
set
  code = coalesce(
    nullif(trim(code), ''),
    nullif(trim(payload->>'code'), ''),
    'P-' || left(id, 6)
  ),
  nom = coalesce(
    nullif(trim(nom), ''),
    nullif(trim(payload->>'nom'), ''),
    nullif(trim(payload->>'lastName'), ''),
    nullif(trim(payload->>'last_name'), ''),
    ''
  ),
  prenoms = coalesce(
    nullif(trim(prenoms), ''),
    nullif(trim(payload->>'prenoms'), ''),
    nullif(trim(payload->>'firstName'), ''),
    nullif(trim(payload->>'first_name'), ''),
    ''
  ),
  telephone = coalesce(
    nullif(trim(telephone), ''),
    nullif(trim(payload->>'telephone'), ''),
    null
  )
where
  coalesce(code, '') = ''
  or coalesce(nom, '') = ''
  or coalesce(prenoms, '') = ''
  or telephone is null;

create index if not exists idx_planteurs_coop_nom on public.planteurs (cooperative_id, nom);
create index if not exists idx_planteurs_coop_code on public.planteurs (cooperative_id, code);
