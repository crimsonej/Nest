-- Keep the database contract aligned with the current frontend payloads.

alter table public.users
  add column if not exists faculty_id uuid references public.faculties(id) on delete set null,
  add column if not exists course_id uuid references public.courses(id) on delete set null,
  add column if not exists selected_coordinator boolean not null default false;

alter table public.courseworks
  add column if not exists work_style text not null default 'group_work',
  add column if not exists submission_mode text not null default 'email';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'courseworks_work_style_check'
      and conrelid = 'public.courseworks'::regclass
  ) then
    alter table public.courseworks
      add constraint courseworks_work_style_check
      check (work_style in ('group_work', 'personal'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'courseworks_submission_mode_check'
      and conrelid = 'public.courseworks'::regclass
  ) then
    alter table public.courseworks
      add constraint courseworks_submission_mode_check
      check (submission_mode in ('email', 'handwritten_copy', 'typed_printed'));
  end if;
end;
$$;

create index if not exists users_faculty_id_idx on public.users(faculty_id);
create index if not exists users_course_id_idx on public.users(course_id);