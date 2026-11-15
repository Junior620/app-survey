-- Field data shared between the agents of the same site.
-- Agents (AGENT_TERRAIN, RESPONSABLE_SITE) read and write only rows of the sites the
-- admin assigned them to; admin, sustainability, protection and auditor roles keep the
-- cooperative-wide view. Builds on the per-action policies of migration 009.

create table if not exists public.profile_sites (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  site_id text not null,
  cooperative_id text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, site_id)
);
create index if not exists idx_profile_sites_site on public.profile_sites (site_id);

alter table public.profile_sites enable row level security;

drop policy if exists "profile_sites_select" on public.profile_sites;
create policy "profile_sites_select" on public.profile_sites for select
  using (
    profile_id = auth.uid()
    or (public.is_admin() and cooperative_id = public.my_cooperative_id())
  );

drop policy if exists "profile_sites_admin_write" on public.profile_sites;
create policy "profile_sites_admin_write" on public.profile_sites for all
  using (public.is_admin() and cooperative_id = public.my_cooperative_id())
  with check (public.is_admin() and cooperative_id = public.my_cooperative_id());

create or replace function public.is_site_scoped()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.my_role() in ('AGENT_TERRAIN', 'RESPONSABLE_SITE'), true);
$$;

create or replace function public.can_see_site(target_site text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not public.is_site_scoped()
    or exists (
      select 1 from public.profile_sites ps
      where ps.profile_id = auth.uid() and ps.site_id = target_site
    );
$$;

revoke all on function public.is_site_scoped() from public;
revoke all on function public.can_see_site(text) from public;
grant execute on function public.is_site_scoped() to authenticated;
grant execute on function public.can_see_site(text) to authenticated;

-- A site created by an agent is assigned to that agent, so they keep seeing it.
create or replace function public.assign_site_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_sites (profile_id, site_id, cooperative_id)
  values (new.account_id, new.id, new.cooperative_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists assign_site_creator on public.sites;
create trigger assign_site_creator after insert on public.sites
  for each row execute function public.assign_site_creator();

-- Existing agents keep the sites they created.
insert into public.profile_sites (profile_id, site_id, cooperative_id)
select s.account_id, s.id, s.cooperative_id
from public.sites s
join public.profiles p on p.id = s.account_id
on conflict do nothing;

-- Attachments carry the site of their parent record (filled on push).
alter table public.attachments_meta add column if not exists site_id text;

-- Site-scoped select/insert/update on tables that carry a site.
do $$
declare
  t text;
  col text;
begin
  for t, col in
    select * from (values
      ('sites', 'id'),
      ('secteurs', 'site_id'),
      ('planteurs', 'site_id'),
      ('parcelles', 'site_id'),
      ('formations', 'site_id'),
      ('missions', 'site_id'),
      ('survey_responses_remote', 'site_id'),
      ('questionnaire_assignments_remote', 'site_id')
    ) as v(t, col)
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select
         using (cooperative_id = public.my_cooperative_id() and public.can_see_site(%I))',
      t || '_select', t, col);

    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update
         using (
           cooperative_id = public.my_cooperative_id()
           and public.my_role() <> ''AUDITEUR''
           and public.can_see_site(%I)
         )
         with check (cooperative_id = public.my_cooperative_id())',
      t || '_update', t, col);

    -- Inserting a new site is allowed (its creator is assigned by trigger);
    -- other rows must belong to one of the agent's sites.
    if t <> 'sites' then
      execute format('drop policy if exists %I on public.%I', t || '_insert', t);
      execute format(
        'create policy %I on public.%I for insert
           with check (
             cooperative_id = public.my_cooperative_id()
             and account_id = auth.uid()
             and public.my_role() <> ''AUDITEUR''
             and public.can_see_site(%I)
           )',
        t || '_insert', t, col);
    end if;
  end loop;
end;
$$;

drop policy if exists "attachments_meta_select" on public.attachments_meta;
create policy "attachments_meta_select" on public.attachments_meta for select
  using (
    cooperative_id = public.my_cooperative_id()
    and (site_id is null or public.can_see_site(site_id))
  );
