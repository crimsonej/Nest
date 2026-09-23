-- Add lecturer support to NEST.
-- A lecturer is assigned to exactly ONE course unit via course_units.lecturer_id.
-- Lecturers have READ-ONLY access scoped to their assigned course unit's data.

-- 1. Add lecturer_id column to course_units
alter table public.course_units
  add column if not exists lecturer_id uuid references public.users(id) on delete set null;

comment on column public.course_units.lecturer_id
  is 'The lecturer assigned to teach this course unit. Lecturers get read-only access to its groups, students, and reports.';

-- 2. Helper: is the current user a lecturer?
create or replace function public.is_lecturer_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'lecturer'
  );
$$;

grant execute on function public.is_lecturer_user() to anon, authenticated;

-- 3. Helper: return the course unit ID assigned to the current lecturer (null if none).
create or replace function public.get_lecturer_course_unit_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.course_units
  where lecturer_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_lecturer_course_unit_id() to anon, authenticated;

-- 4. RLS: Lecturers can read their own assigned course unit row
-- (existing faculty-member policies already cover coordinators/admins;
--  add an additional permissive policy for lecturers)
drop policy if exists "Lecturers can read their assigned course unit" on public.course_units;
create policy "Lecturers can read their assigned course unit"
  on public.course_units for select
  using (lecturer_id = auth.uid());

-- 5. RLS: Lecturers can read courseworks for their assigned course unit
drop policy if exists "Lecturers can read their assigned courseworks" on public.courseworks;
create policy "Lecturers can read their assigned courseworks"
  on public.courseworks for select
  using (course_unit_id = public.get_lecturer_course_unit_id());

-- 6. RLS: Lecturers can read groups whose coursework belongs to their course unit
drop policy if exists "Lecturers can read their assigned groups" on public.groups;
create policy "Lecturers can read their assigned groups"
  on public.groups for select
  using (
    exists (
      select 1
      from public.courseworks cw
      where cw.id = groups.coursework_id
        and cw.course_unit_id = public.get_lecturer_course_unit_id()
    )
  );

-- 7. RLS: Lecturers can read group_members for groups in their unit
drop policy if exists "Lecturers can read their assigned group members" on public.group_members;
create policy "Lecturers can read their assigned group members"
  on public.group_members for select
  using (
    exists (
      select 1
      from public.groups g
      join public.courseworks cw on cw.id = g.coursework_id
      where g.id = group_members.group_id
        and cw.course_unit_id = public.get_lecturer_course_unit_id()
    )
  );

-- 8. RLS: Lecturers can read student_course_units enrollments for their unit
drop policy if exists "Lecturers can read enrollments for their unit" on public.student_course_units;
create policy "Lecturers can read enrollments for their unit"
  on public.student_course_units for select
  using (course_unit_id = public.get_lecturer_course_unit_id());

-- 9. RLS: Lecturers can read user profiles (students) enrolled in their unit
-- The existing broad "Users can read permitted profiles" policy covers this via
-- the group_members path; add a direct enrollments path for extra coverage.
drop policy if exists "Lecturers can read enrolled student profiles" on public.users;
create policy "Lecturers can read enrolled student profiles"
  on public.users for select
  using (
    public.is_lecturer_user() and exists (
      select 1
      from public.student_course_units scu
      where scu.user_id = users.id
        and scu.course_unit_id = public.get_lecturer_course_unit_id()
    )
  );
