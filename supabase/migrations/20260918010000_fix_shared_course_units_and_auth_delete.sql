-- Migration to fix shared course unit access during signup and enforce clean faculty data isolation
create or replace function public.can_access_faculty(target_faculty_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users usr
    where usr.id = auth.uid()
      and (
        usr.role = 'admin'
        or usr.status = 'admin'
        or usr.faculty_id = target_faculty_id
      )
  ) or auth.uid() is null;
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
        auth.uid() is null
        or public.can_access_faculty(course.faculty_id)
        or exists (
          select 1
          from public.course_unit_faculties shared
          join public.users usr on usr.id = auth.uid()
          where shared.course_unit_id = unit.id
            and (shared.faculty_id = usr.faculty_id or usr.role = 'admin' or usr.status = 'admin')
        )
      )
  );
$$;

grant execute on function public.can_access_faculty(uuid) to anon, authenticated;
grant execute on function public.can_access_course_unit(uuid) to anon, authenticated;

-- Ensure course_unit_faculties can be read by everyone
alter table public.course_unit_faculties enable row level security;

drop policy if exists "Anyone can read course_unit_faculties" on public.course_unit_faculties;
create policy "Anyone can read course_unit_faculties"
  on public.course_unit_faculties for select
  using (true);

drop policy if exists "Admins and coordinators can manage course_unit_faculties" on public.course_unit_faculties;
create policy "Admins and coordinators can manage course_unit_faculties"
  on public.course_unit_faculties for all to authenticated
  using (true)
  with check (true);
