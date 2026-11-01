-- Security hardening after audit (Nov 2026).
-- 1. Sign-up can no longer pick its own role or cooperative.
-- 2. Non-admins cannot change their own role / cooperative / email.
-- 3. A profile without a cooperative gets no data (no 'scpb-default' fallback).
-- 4. Mirror tables: server-side updated_at, stale revisions rejected,
--    ownership kept on update, auditors read-only, deletes admin-only.
-- 5. outbox_ingest (consents, remediation cases) readable by owner + protection roles only.

-- --- 1. New users: always field agent, no cooperative until an admin assigns one ---
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
    'AGENT_TERRAIN',
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.profiles alter column cooperative_id drop default;

-- --- 3. No implicit tenant ---
create or replace function public.my_cooperative_id()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select nullif(trim(cooperative_id), '') from public.profiles where id = auth.uid();
$$;

revoke execute on function public.is_admin() from anon;

-- --- 2. Protected profile columns ---
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.cooperative_id is distinct from old.cooperative_id
     or new.email is distinct from old.email then
    raise exception 'Only an administrator can change role, cooperative or email'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Admins manage profiles of their own cooperative, plus freshly created ones (no cooperative yet).
drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all"
  on public.profiles for update
  using (
    public.is_admin()
    and (cooperative_id is null or cooperative_id = public.my_cooperative_id())
  )
  with check (
    public.is_admin()
    and cooperative_id = public.my_cooperative_id()
  );

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
  on public.profiles for select
  using (
    public.is_admin()
    and (cooperative_id is null or cooperative_id = public.my_cooperative_id())
  );

drop policy if exists "profiles_coop_select" on public.profiles;
create policy "profiles_coop_select"
  on public.profiles for select
  using (
    id = auth.uid()
    or cooperative_id = public.my_cooperative_id()
  );

-- --- 4. Mirror tables ---
create or replace function public.guard_mirror_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    if new.revision < old.revision then
      raise exception 'stale_revision: % < %', new.revision, old.revision
        using errcode = 'P0409';
    end if;
    new.account_id = old.account_id;
    new.created_at = old.created_at;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'sites', 'planteurs', 'survey_responses_remote', 'secteurs', 'villages',
    'parcelles', 'formations', 'seances', 'participations', 'missions',
    'questionnaires_remote', 'questionnaire_versions_remote',
    'questionnaire_assignments_remote', 'attachments_meta', 'geometry_versions_remote'
  ]
  loop
    execute format('drop trigger if exists guard_mirror_write on public.%I', t);
    execute format(
      'create trigger guard_mirror_write before insert or update on public.%I
         for each row execute function public.guard_mirror_write()', t);

    -- Stable pull pagination on (updated_at, id)
    execute format(
      'create index if not exists %I on public.%I (cooperative_id, updated_at, id)',
      'idx_' || t || '_coop_cursor', t);

    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    execute format(
      'create policy %I on public.%I for select
         using (cooperative_id = public.my_cooperative_id())',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert
         with check (
           cooperative_id = public.my_cooperative_id()
           and account_id = auth.uid()
           and public.my_role() <> ''AUDITEUR''
         )',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update
         using (cooperative_id = public.my_cooperative_id() and public.my_role() <> ''AUDITEUR'')
         with check (cooperative_id = public.my_cooperative_id())',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete
         using (cooperative_id = public.my_cooperative_id() and public.is_admin())',
      t || '_delete', t);
  end loop;
end;
$$;

-- --- 5. outbox_ingest: sensitive catch-all (consents, remediation cases) ---
drop policy if exists "outbox_ingest_coop_all" on public.outbox_ingest;
drop policy if exists "outbox_ingest_select" on public.outbox_ingest;
drop policy if exists "outbox_ingest_insert" on public.outbox_ingest;
drop policy if exists "outbox_ingest_update" on public.outbox_ingest;

create policy "outbox_ingest_select"
  on public.outbox_ingest for select
  using (
    cooperative_id = public.my_cooperative_id()
    and (
      account_id = auth.uid()
      or public.my_role() in ('ADMIN', 'RESPONSABLE_DURABILITE', 'REFERENT_PROTECTION')
    )
  );

create policy "outbox_ingest_insert"
  on public.outbox_ingest for insert
  with check (
    cooperative_id = public.my_cooperative_id()
    and account_id = auth.uid()
    and public.my_role() <> 'AUDITEUR'
  );

create policy "outbox_ingest_update"
  on public.outbox_ingest for update
  using (cooperative_id = public.my_cooperative_id() and account_id = auth.uid())
  with check (cooperative_id = public.my_cooperative_id() and account_id = auth.uid());

-- Storage: auditors cannot write or delete blobs; deletes admin-only.
drop policy if exists "attachments_storage_insert" on storage.objects;
create policy "attachments_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.my_cooperative_id()
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.my_role() <> 'AUDITEUR'
  );

drop policy if exists "attachments_storage_update" on storage.objects;
create policy "attachments_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.my_cooperative_id()
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "attachments_storage_delete" on storage.objects;
create policy "attachments_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.my_cooperative_id()
    and public.is_admin()
  );
