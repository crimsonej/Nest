-- A course belongs to one faculty. A course unit may optionally be shared
-- with additional faculties through this join table.

create table if not exists public.course_unit_faculties (
  course_unit_id uuid not null references public.course_units(id) on delete cascade,
  faculty_id uuid not null references public.faculties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_unit_id, faculty_id)
);

create index if not exists course_unit_faculties_faculty_id_idx
  on public.course_unit_faculties(faculty_id);

alter table public.course_unit_faculties enable row level security;

drop policy if exists "Authenticated users can read course unit faculty assignments" on public.course_unit_faculties;
create policy "Authenticated users can read course unit faculty assignments"
  on public.course_unit_faculties for select to authenticated using (true);

drop policy if exists "Admins can manage course unit faculty assignments" on public.course_unit_faculties;
create policy "Admins can manage course unit faculty assignments"
  on public.course_unit_faculties for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));