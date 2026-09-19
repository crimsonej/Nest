-- Migration to allow users to update their user profile row by auth UID or matching email.

drop policy if exists "Coordinators and admins can update user profiles" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Users and coordinators can manage users" on public.users;

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
