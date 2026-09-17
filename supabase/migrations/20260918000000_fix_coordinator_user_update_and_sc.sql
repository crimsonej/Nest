-- Migration to fix coordinator update permissions on users, selected_coordinators management, and faculty deletion.

-- 1. USERS UPDATE POLICY (Allow coordinators and admins to update student statuses/profiles)
drop policy if exists "Users can update own profiles" on public.users;
drop policy if exists "Users and coordinators can manage users" on public.users;

create policy "Coordinators and admins can update user profiles"
  on public.users for update to authenticated
  using (id = auth.uid() or public.is_admin_user() or public.is_coordinator_user())
  with check (id = auth.uid() or public.is_admin_user() or public.is_coordinator_user());

-- 2. SELECTED_COORDINATORS POLICIES
alter table public.selected_coordinators enable row level security;

drop policy if exists "Anyone can read selected coordinators" on public.selected_coordinators;
create policy "Anyone can read selected coordinators"
  on public.selected_coordinators for select
  using (true);

drop policy if exists "Coordinators and admins can manage selected coordinators" on public.selected_coordinators;
create policy "Coordinators and admins can manage selected coordinators"
  on public.selected_coordinators for all to authenticated
  using (public.is_coordinator_user() or public.is_admin_user())
  with check (public.is_coordinator_user() or public.is_admin_user());

-- 3. FACULTIES DELETE POLICY (Allow admins and coordinators to delete faculties)
drop policy if exists "Coordinators and admins can delete faculties" on public.faculties;
create policy "Coordinators and admins can delete faculties"
  on public.faculties for delete to authenticated
  using (public.is_coordinator_user() or public.is_admin_user());
