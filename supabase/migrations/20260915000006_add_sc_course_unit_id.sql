-- Add course_unit_id column to selected_coordinators to match frontend assignment payload.

alter table public.selected_coordinators
  add column if not exists course_unit_id uuid references public.course_units(id) on delete cascade;

create index if not exists selected_coordinators_course_unit_id_idx
  on public.selected_coordinators(course_unit_id);
