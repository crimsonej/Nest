-- Faster reads: remove row-level security policies that never change the result.
--
-- Every table below already has a permissive SELECT policy allowing any signed-in user
-- ("auth.uid() IS NOT NULL"). The narrower faculty/lecturer SELECT policies were OR'ed
-- with it, so they granted nothing extra to signed-in users, but Postgres still evaluated
-- them for every row, and each one queried other RLS-protected tables, which ran their
-- policies in turn. A 469-row group_members read took over a second because of it.
--
-- "FOR ALL" manage policies also apply to SELECT, so the ones that duplicate existing
-- per-command INSERT/UPDATE/DELETE policies are dropped as well. The admin user-management
-- policy is kept for INSERT and DELETE (nothing else grants those to admins).
--
-- Verified before applying: a coordinator, a lecturer, a student and an anonymous request
-- each see exactly the same rows in all six tables before and after this change.
--
-- The semester-scope restrictive policies are unchanged.

-- groups
drop policy if exists "Faculty members can read their groups" on public.groups;
drop policy if exists "Lecturers can read their assigned groups" on public.groups;

-- group_members
drop policy if exists "Faculty members can read their group members" on public.group_members;
drop policy if exists "Lecturers can read their assigned group members" on public.group_members;
-- Writes are already allowed to every signed-in user by the per-command policies.
drop policy if exists "Lecturers can manage group members for their unit" on public.group_members;

-- courseworks
drop policy if exists "Faculty members can read their courseworks" on public.courseworks;
drop policy if exists "Lecturers can read their assigned courseworks" on public.courseworks;
-- Covered by "Coordinators and admins can insert/update/delete courseworks".
drop policy if exists "Coordinators can manage courseworks" on public.courseworks;

-- course_units
drop policy if exists "Faculty members can read their course units" on public.course_units;
drop policy if exists "Lecturers can read their assigned course unit" on public.course_units;
drop policy if exists "Coordinators can manage course units" on public.course_units;
drop policy if exists "Admins can manage course units" on public.course_units;

-- courses
drop policy if exists "Faculty members can read their courses" on public.courses;
drop policy if exists "Coordinators can manage courses" on public.courses;
drop policy if exists "Admins can manage courses" on public.courses;

-- users
drop policy if exists "Lecturers can read enrolled student profiles" on public.users;
drop policy if exists "Users can read permitted profiles" on public.users;
drop policy if exists "Users can read their own profile" on public.users;
drop policy if exists "Admins can manage users" on public.users;
drop policy if exists "Admins can insert users" on public.users;
create policy "Admins can insert users" on public.users
  for insert to authenticated with check ((select public.is_admin_user()));
drop policy if exists "Admins can delete users" on public.users;
create policy "Admins can delete users" on public.users
  for delete to authenticated using ((select public.is_admin_user()));
