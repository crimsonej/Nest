-- Migration to allow users to read and update their user profile row by auth UID or matching email.

drop policy if exists "Coordinators and admins can update user profiles" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Users can update own profiles" on public.users;
drop policy if exists "Users and coordinators can manage users" on public.users;
drop policy if exists "Users and coordinators can update user profiles" on public.users;

create policy "Users and coordinators can update user profiles"
  on public.users for update to authenticated
  using (
    id = auth.uid() 
    or lower(email) = lower(auth.jwt()->>'email') 
    or public.is_admin_user() 
    or public.is_coordinator_user()
  )
  with check (
    id = auth.uid() 
    or lower(email) = lower(auth.jwt()->>'email') 
    or public.is_admin_user() 
    or public.is_coordinator_user()
  );

-- Ensure matching SELECT policy exists so updates returning rows (.select()) succeed
drop policy if exists "Users can read permitted profiles" on public.users;
drop policy if exists "Anyone can read public users" on public.users;

create policy "Users can read permitted profiles"
  on public.users for select
  using (
    id = auth.uid()
    or lower(email) = lower(auth.jwt()->>'email')
    or public.is_admin_user()
    or public.is_coordinator_user()
    or exists (
      select 1
      from public.group_members current_membership
      join public.group_members target_member on target_member.group_id = current_membership.group_id
      where current_membership.user_id = auth.uid()
        and target_member.user_id = users.id
    )
  );
