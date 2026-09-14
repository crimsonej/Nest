-- Ndejje University catalog and signup rules.
-- Run after the base schema has created users, universities, faculties,
-- courses, and course_units.

create table if not exists public.genders (
  code text primary key,
  name text not null unique,
  is_active boolean not null default true
);

insert into public.genders (code, name)
values ('M', 'Male'), ('F', 'Female')
on conflict (code) do update
set name = excluded.name, is_active = true;

insert into public.universities (
  university,
  abbreviation,
  branch,
  location,
  accepted_reg_number_pattern,
  example_reg_number
)
values (
  'Ndejje University',
  'NDU',
  'Kampala Campus',
  'Kampala, Uganda',
    '^[0-9]{2}/[12]/[0-9]{3}/D/[0-9]{4}$',
  '26/2/222/D/2222'
)
on conflict (university) do update
set abbreviation = excluded.abbreviation,
    branch = excluded.branch,
    location = excluded.location,
    accepted_reg_number_pattern = excluded.accepted_reg_number_pattern,
    example_reg_number = excluded.example_reg_number;

insert into public.faculties (code, name, is_active)
values ('FSC', 'Faculty of Science and Computing', true)
on conflict (code) do update
set name = excluded.name, is_active = true;

insert into public.courses (code, name, faculty_id, is_active)
select catalog.code, catalog.name, faculties.id, true
from (
  values
    ('DIT', 'Diploma in Information Technology'),
    ('BCS', 'Bachelor of Computer Science'),
    ('BSE', 'Bachelor of Software Engineering'),
    ('BIT', 'Bachelor in Information Technology'),
    ('BBC', 'Bachelor in Business Computing'),
    ('DCS', 'Diploma in Computer Science'),
    ('DBC', 'Diploma in Business Computing'),
    ('BSD', 'Bachelor in Software Development'),
    ('BIT-SD', 'Bachelor in Software Designing')
) as catalog(code, name)
cross join lateral (
  select id from public.faculties where code = 'FSC' limit 1
) as faculties
on conflict (code) do update
set name = excluded.name,
    faculty_id = excluded.faculty_id,
    is_active = true;

alter table public.course_units
  add column if not exists source_code text,
  add column if not exists course_id uuid;

insert into public.course_units (
  code,
  source_code,
  name,
  course_id,
  coordinator_id,
  is_active
)
select catalog.database_code,
       catalog.source_code,
       catalog.name,
       courses.id,
       coordinators.id,
       true
from (
  values
    ('1101-CE', '1101', 'Christian Ethics', 'DIT'),
    ('1104-MIT', '1104', 'Mathematics for IT', 'DIT'),
    ('1103-ED', '1103', 'Entrepreneurship & Development', 'DIT'),
    ('1104-IT', '1104', 'Introduction to Information Technology', 'DIT'),
    ('1106-FIS', '1106', 'Fundamentals of Information Systems', 'DIT'),
    ('1108', '1108', 'Cisco', 'DIT'),
    ('1109', '1109', 'Huawei', 'DIT'),
    ('1101-PP', '1101', 'Principles of Programming', 'DIT'),
    ('1102-CS', '1102', 'Communication Skills', 'DIT')
) as catalog(database_code, source_code, name, course_code)
join public.courses on courses.code = catalog.course_code
cross join lateral (
  select id from public.users
  where role = 'coordinator'
  order by created_at
  limit 1
) as coordinators
on conflict (code) do update
set source_code = excluded.source_code,
    name = excluded.name,
    course_id = excluded.course_id,
    is_active = true;

create or replace function public.validate_ndejje_student_profile()
returns trigger
language plpgsql
as $$
begin
  if new.university = 'Ndejje University'
     and new.student_registration_number is not null
    and new.student_registration_number !~ '^[0-9]{2}/[12]/[0-9]{3}/D/[0-9]{4}$' then
    raise exception 'Ndejje University registration number must match 00/0/000/D/0000';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_ndejje_student_profile on public.users;
create trigger validate_ndejje_student_profile
before insert or update of university, student_registration_number
on public.users
for each row execute function public.validate_ndejje_student_profile();
