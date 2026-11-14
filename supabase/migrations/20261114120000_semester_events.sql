-- Semester calendar: key dates (opening, orientation, exams ...) for each semester.

create table if not exists public.semester_events (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  kind text not null default 'other' check (kind in (
    'opening', 'registration', 'orientation', 'lectures', 'coursework', 'tests',
    'break', 'exams', 'results', 'closing', 'holiday', 'other'
  )),
  starts_on date not null,
  ends_on date,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint semester_events_dates check (ends_on is null or ends_on >= starts_on)
);

create index if not exists semester_events_semester_idx on public.semester_events (semester_id, starts_on);

alter table public.semester_events enable row level security;

drop policy if exists "Signed-in users read semester events" on public.semester_events;
create policy "Signed-in users read semester events" on public.semester_events
  for select using (auth.uid() is not null);

drop policy if exists "Staff manage semester events" on public.semester_events;
create policy "Staff manage semester events" on public.semester_events
  for all using (public.can_manage_semesters()) with check (public.can_manage_semesters());

-- A semester cannot end before it starts.
alter table public.semesters drop constraint if exists semesters_dates_order;
alter table public.semesters add constraint semesters_dates_order
  check (ends_on is null or starts_on is null or ends_on >= starts_on) not valid;
