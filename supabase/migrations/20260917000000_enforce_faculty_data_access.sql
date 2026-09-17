-- Enforce faculty separation for academic data.
-- Courses belong to one faculty. Course units may additionally be shared
-- through course_unit_faculties. Admins can access all faculties.

create or replace function public.can_access_faculty(target_faculty_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users current_user
    where current_user.id = auth.uid()
      and (
        current_user.role = 'admin'
        or current_user.status = 'admin'
        or current_user.faculty_id = target_faculty_id
      )
  );
$$;

create or replace function public.can_access_course_unit(target_course_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_units unit
    join public.courses course on course.id = unit.course_id
    where unit.id = target_course_unit_id
      and (
        public.can_access_faculty(course.faculty_id)
        or exists (
          select 1
          from public.course_unit_faculties shared
          join public.users current_user on current_user.id = auth.uid()
          where shared.course_unit_id = unit.id
            and shared.faculty_id = current_user.faculty_id
        )
      )
  );
$$;

grant execute on function public.can_access_faculty(uuid) to anon, authenticated;
grant execute on function public.can_access_course_unit(uuid) to anon, authenticated;

drop policy if exists "Anyone can read courses" on public.courses;
drop policy if exists "Coordinators and admins can manage courses" on public.courses;
create policy "Faculty members can read their courses"
  on public.courses for select
  using (public.can_access_faculty(faculty_id));
create policy "Coordinators and admins can insert courses"
  on public.courses for insert to authenticated
  with check (public.is_coordinator_user() or public.is_admin_user());
create policy "Coordinators and admins can update courses"
  on public.courses for update to authenticated
  using (public.is_coordinator_user() or public.is_admin_user())
  with check (public.is_coordinator_user() or public.is_admin_user());
create policy "Coordinators and admins can delete courses"
  on public.courses for delete to authenticated
  using (public.is_coordinator_user() or public.is_admin_user());

drop policy if exists "Anyone can read course units" on public.course_units;
drop policy if exists "Coordinators and admins can manage course units" on public.course_units;
create policy "Faculty members can read their course units"
  on public.course_units for select
  using (public.can_access_course_unit(id));
create policy "Coordinators and admins can insert course units"
  on public.course_units for insert to authenticated
  with check (public.is_coordinator_user() or public.is_admin_user());
create policy "Coordinators and admins can update course units"
  on public.course_units for update to authenticated
  using (public.is_coordinator_user() or public.is_admin_user())
  with check (public.is_coordinator_user() or public.is_admin_user());
create policy "Coordinators and admins can delete course units"
  on public.course_units for delete to authenticated
  using (public.is_coordinator_user() or public.is_admin_user());

drop policy if exists "Anyone can read courseworks" on public.courseworks;
drop policy if exists "Coordinators and admins can insert coursework" on public.courseworks;
drop policy if exists "Coordinators and admins can update coursework" on public.courseworks;
drop policy if exists "Coordinators and admins can delete coursework" on public.courseworks;
drop policy if exists "Admins can manage coursework" on public.courseworks;
create policy "Faculty members can read their courseworks"
  on public.courseworks for select
  using (public.can_access_course_unit(course_unit_id));
create policy "Coordinators and admins can insert courseworks"
  on public.courseworks for insert to authenticated
  with check (public.is_coordinator_user() or public.is_admin_user());
create policy "Coordinators and admins can update courseworks"
  on public.courseworks for update to authenticated
  using (public.is_coordinator_user() or public.is_admin_user())
  with check (public.is_coordinator_user() or public.is_admin_user());
create policy "Coordinators and admins can delete courseworks"
  on public.courseworks for delete to authenticated
  using (public.is_coordinator_user() or public.is_admin_user());

drop policy if exists "Anyone can read groups" on public.groups;
drop policy if exists "Authenticated users can manage groups" on public.groups;
create policy "Faculty members can read their groups"
  on public.groups for select
  using (
    exists (
      select 1
      from public.courseworks coursework
      where coursework.id = groups.coursework_id
        and public.can_access_course_unit(coursework.course_unit_id)
    )
  );
create policy "Authenticated users can insert groups"
  on public.groups for insert to authenticated
  with check (true);
create policy "Authenticated users can update groups"
  on public.groups for update to authenticated
  using (true)
  with check (true);
create policy "Authenticated users can delete groups"
  on public.groups for delete to authenticated
  using (true);

drop policy if exists "Anyone can read group members" on public.group_members;
drop policy if exists "Authenticated users can manage group members" on public.group_members;
create policy "Faculty members can read their group members"
  on public.group_members for select
  using (
    exists (
      select 1
      from public.groups group_row
      join public.courseworks coursework on coursework.id = group_row.coursework_id
      where group_row.id = group_members.group_id
        and public.can_access_course_unit(coursework.course_unit_id)
    )
  );
create policy "Authenticated users can insert group members"
  on public.group_members for insert to authenticated
  with check (true);
create policy "Authenticated users can update group members"
  on public.group_members for update to authenticated
  using (true)
  with check (true);
create policy "Authenticated users can delete group members"
  on public.group_members for delete to authenticated
  using (true);

drop policy if exists "Anyone can read student course units" on public.student_course_units;
drop policy if exists "Authenticated users can manage student course units" on public.student_course_units;
create policy "Students can read their course unit enrollments"
  on public.student_course_units for select
  using (user_id = auth.uid() or public.is_admin_user());
create policy "Authenticated users can insert student course units"
  on public.student_course_units for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin_user());
create policy "Authenticated users can update student course units"
  on public.student_course_units for update to authenticated
  using (user_id = auth.uid() or public.is_admin_user())
  with check (user_id = auth.uid() or public.is_admin_user());
create policy "Authenticated users can delete student course units"
  on public.student_course_units for delete to authenticated
  using (user_id = auth.uid() or public.is_admin_user());

drop policy if exists "Anyone can read public users" on public.users;
drop policy if exists "Users and coordinators can manage users" on public.users;
create policy "Users can read permitted profiles"
  on public.users for select
  using (
    id = auth.uid()
    or public.is_admin_user()
    or exists (
      select 1
      from public.users current_user
      where current_user.id = auth.uid()
        and (
          current_user.role = 'coordinator'
          or current_user.status in ('coordinator', 'selected_coordinator')
        )
        and current_user.faculty_id = users.faculty_id
    )
    or exists (
      select 1
      from public.group_members member_row
      join public.groups group_row on group_row.id = member_row.group_id
      join public.courseworks coursework on coursework.id = group_row.coursework_id
      where member_row.user_id = users.id
        and public.can_access_course_unit(coursework.course_unit_id)
        and exists (
          select 1
          from public.group_members current_membership
          where current_membership.group_id = group_row.id
            and current_membership.user_id = auth.uid()
        )
    )
  );
  create policy "Users can update own profiles"
    on public.users for update to authenticated
    using (id = auth.uid() or public.is_admin_user())
    with check (id = auth.uid() or public.is_admin_user());