-- Make frontend writes match the role model used by the admin workspace.

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to anon, authenticated;

alter table public.users enable row level security;
alter table public.faculties enable row level security;
alter table public.courses enable row level security;
alter table public.course_units enable row level security;
alter table public.courseworks enable row level security;

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile"
  on public.users for select to authenticated
  using (id = auth.uid() or public.is_admin_user());

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
  on public.users for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Admins can manage users" on public.users;
create policy "Admins can manage users"
  on public.users for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can manage faculties" on public.faculties;
create policy "Admins can manage faculties"
  on public.faculties for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can manage courses" on public.courses;
create policy "Admins can manage courses"
  on public.courses for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can manage course units" on public.course_units;
create policy "Admins can manage course units"
  on public.course_units for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can manage coursework" on public.courseworks;
create policy "Admins can manage coursework"
  on public.courseworks for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());