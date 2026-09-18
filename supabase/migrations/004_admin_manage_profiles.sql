-- Admin can manage profiles; own update cannot escalate role.

create or replace function public.my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.my_role() from public;
grant execute on function public.my_role() to authenticated;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = public.my_role()
  );

drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());
