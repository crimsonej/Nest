-- =============================================================================
-- Semesters
--
-- Every course unit now belongs to a semester. Everything built on a course
-- unit (courseworks, groups, members, enrollments, tasks, rosters, requests)
-- inherits that semester, so old semesters stay intact and each new semester
-- starts empty unless units are imported.
--
-- Which semester a request sees is decided by public.viewing_semester_id():
--   * staff (admin / coordinator / lecturer) can pick any semester with the
--     `x-nest-semester` request header (sent by the browser client);
--   * everyone else always sees the current semester;
--   * students see nothing while student access is locked.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  academic_year text not null,
  term_number integer not null check (term_number between 1 and 3),
  starts_on date,
  ends_on date,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'ended')),
  is_current boolean not null default false,
  ended_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year, term_number)
);

create unique index if not exists semesters_single_current on public.semesters (is_current) where is_current;

-- Single-row switch that locks the student portal.
create table if not exists public.student_access (
  id boolean primary key default true check (id),
  is_locked boolean not null default false,
  locked_until timestamptz,
  message text,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.student_access (id) values (true) on conflict (id) do nothing;

-- One row per student per semester they are confirmed in.
create table if not exists public.student_semester_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  source text not null default 'verified' check (source in ('verified', 'registered', 'imported')),
  full_name text,
  registration_number text,
  course_id uuid references public.courses(id) on delete set null,
  verified_at timestamptz not null default now(),
  unique (user_id, semester_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'students' check (audience in ('students', 'staff', 'everyone')),
  tone text not null default 'info' check (tone in ('info', 'success', 'warning')),
  semester_id uuid references public.semesters(id) on delete set null,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists announcements_active_idx on public.announcements (is_active, created_at desc);

-- ---------------------------------------------------------------------------
-- Seed Semester 1 and backfill
-- ---------------------------------------------------------------------------
insert into public.semesters (name, academic_year, term_number, starts_on, status, is_current)
select 'Semester 1', '2026/2027', 1, date '2026-08-01', 'active', true
where not exists (select 1 from public.semesters);

alter table public.course_units add column if not exists semester_id uuid references public.semesters(id) on delete restrict;
update public.course_units set semester_id = (select id from public.semesters where is_current limit 1) where semester_id is null;
alter table public.course_units alter column semester_id set not null;
create index if not exists course_units_semester_idx on public.course_units (semester_id);

-- The same unit code can now exist once per semester.
alter table public.course_units drop constraint if exists course_units_code_key;
alter table public.course_units drop constraint if exists course_units_code_semester_key;
alter table public.course_units add constraint course_units_code_semester_key unique (code, semester_id);

-- Every existing student is part of Semester 1.
insert into public.student_semester_records (user_id, semester_id, source, full_name, registration_number, course_id, verified_at)
select u.id, s.id, 'imported', u.full_name, u.student_registration_number, u.course_id, u.created_at
from public.users u
cross join public.semesters s
where s.is_current and u.role = 'student'
on conflict (user_id, semester_id) do nothing;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.current_semester_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.semesters where is_current limit 1;
$$;

create or replace function public.is_staff_user()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin_user() or public.is_coordinator_user() or public.is_lecturer_user();
$$;

create or replace function public.can_manage_semesters()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin_user() or public.is_coordinator_user();
$$;

create or replace function public.student_access_locked()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_locked and (locked_until is null or locked_until > now()) from public.student_access where id),
    false
  );
$$;

create or replace function public.viewing_semester_id()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  requested text;
  requested_id uuid;
begin
  if auth.uid() is not null and public.is_staff_user() then
    begin
      requested := nullif(current_setting('request.headers', true), '')::json ->> 'x-nest-semester';
    exception when others then
      requested := null;
    end;

    if requested ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id into requested_id from public.semesters where id = requested::uuid;
      if requested_id is not null then
        return requested_id;
      end if;
    end if;

    return public.current_semester_id();
  end if;

  if auth.uid() is not null and public.student_access_locked() then
    return null;
  end if;

  return public.current_semester_id();
end;
$$;

create or replace function public.semester_of_course_unit(target uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select semester_id from public.course_units where id = target;
$$;

create or replace function public.semester_of_coursework(target uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select cu.semester_id
  from public.courseworks cw join public.course_units cu on cu.id = cw.course_unit_id
  where cw.id = target;
$$;

create or replace function public.semester_of_group(target uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select cu.semester_id
  from public.groups g
  join public.courseworks cw on cw.id = g.coursework_id
  join public.course_units cu on cu.id = cw.course_unit_id
  where g.id = target;
$$;

-- Lecturers follow their unit into whichever semester they are viewing.
create or replace function public.get_lecturer_course_unit_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from public.course_units
      where lecturer_id = auth.uid() and semester_id = public.viewing_semester_id()
      limit 1),
    (select l.course_unit_id from public.lecturers l
      join public.course_units cu on cu.id = l.course_unit_id
      where l.id = auth.uid() and cu.semester_id = public.viewing_semester_id()
      limit 1)
  );
$$;

-- New course units land in the semester the creator is viewing.
alter table public.course_units alter column semester_id set default public.viewing_semester_id();

-- ---------------------------------------------------------------------------
-- Semester scoping (restrictive policies AND with the existing ones)
-- ---------------------------------------------------------------------------
drop policy if exists "Semester scope" on public.course_units;
create policy "Semester scope" on public.course_units as restrictive for all
  using (semester_id = (select public.viewing_semester_id()))
  with check (semester_id = (select public.viewing_semester_id()));

drop policy if exists "Semester scope" on public.courseworks;
create policy "Semester scope" on public.courseworks as restrictive for all
  using (public.semester_of_course_unit(course_unit_id) = (select public.viewing_semester_id()))
  with check (public.semester_of_course_unit(course_unit_id) = (select public.viewing_semester_id()));

drop policy if exists "Semester scope" on public.student_course_units;
create policy "Semester scope" on public.student_course_units as restrictive for all
  using (public.semester_of_course_unit(course_unit_id) = (select public.viewing_semester_id()))
  with check (public.semester_of_course_unit(course_unit_id) = (select public.viewing_semester_id()));

drop policy if exists "Semester scope" on public.group_change_requests;
create policy "Semester scope" on public.group_change_requests as restrictive for all
  using (public.semester_of_course_unit(target_course_unit_id) = (select public.viewing_semester_id()))
  with check (public.semester_of_course_unit(target_course_unit_id) = (select public.viewing_semester_id()));

drop policy if exists "Semester scope" on public.groups;
create policy "Semester scope" on public.groups as restrictive for all
  using (public.semester_of_coursework(coursework_id) = (select public.viewing_semester_id()))
  with check (public.semester_of_coursework(coursework_id) = (select public.viewing_semester_id()));

drop policy if exists "Semester scope" on public.tasks;
create policy "Semester scope" on public.tasks as restrictive for all
  using (public.semester_of_coursework(coursework_id) = (select public.viewing_semester_id()))
  with check (public.semester_of_coursework(coursework_id) = (select public.viewing_semester_id()));

drop policy if exists "Semester scope" on public.coursework_roster;
create policy "Semester scope" on public.coursework_roster as restrictive for all
  using (public.semester_of_coursework(coursework_id) = (select public.viewing_semester_id()))
  with check (public.semester_of_coursework(coursework_id) = (select public.viewing_semester_id()));

drop policy if exists "Semester scope" on public.group_members;
create policy "Semester scope" on public.group_members as restrictive for all
  using (public.semester_of_group(group_id) = (select public.viewing_semester_id()))
  with check (public.semester_of_group(group_id) = (select public.viewing_semester_id()));

drop policy if exists "Semester scope" on public.group_join_requests;
create policy "Semester scope" on public.group_join_requests as restrictive for all
  using (public.semester_of_group(group_id) = (select public.viewing_semester_id()))
  with check (public.semester_of_group(group_id) = (select public.viewing_semester_id()));

drop policy if exists "Semester scope" on public.resources;
create policy "Semester scope" on public.resources as restrictive for all
  using (public.semester_of_group(group_id) = (select public.viewing_semester_id()))
  with check (public.semester_of_group(group_id) = (select public.viewing_semester_id()));

-- ---------------------------------------------------------------------------
-- RLS for the new tables
-- ---------------------------------------------------------------------------
alter table public.semesters enable row level security;
alter table public.student_access enable row level security;
alter table public.student_semester_records enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "Anyone can read semesters" on public.semesters;
create policy "Anyone can read semesters" on public.semesters for select using (true);
drop policy if exists "Staff manage semesters" on public.semesters;
create policy "Staff manage semesters" on public.semesters for insert with check (public.can_manage_semesters());
drop policy if exists "Staff update semesters" on public.semesters;
create policy "Staff update semesters" on public.semesters for update using (public.can_manage_semesters()) with check (public.can_manage_semesters());
drop policy if exists "Admins delete semesters" on public.semesters;
create policy "Admins delete semesters" on public.semesters for delete using (public.is_admin_user());

drop policy if exists "Signed-in users read student access" on public.student_access;
create policy "Signed-in users read student access" on public.student_access for select using (auth.uid() is not null);
drop policy if exists "Staff update student access" on public.student_access;
create policy "Staff update student access" on public.student_access for update using (public.can_manage_semesters()) with check (public.can_manage_semesters());

drop policy if exists "Read own or staff semester records" on public.student_semester_records;
create policy "Read own or staff semester records" on public.student_semester_records for select
  using (user_id = auth.uid() or public.is_staff_user());
drop policy if exists "Staff manage semester records" on public.student_semester_records;
create policy "Staff manage semester records" on public.student_semester_records for all
  using (public.can_manage_semesters()) with check (public.can_manage_semesters());

drop policy if exists "Read announcements for audience" on public.announcements;
create policy "Read announcements for audience" on public.announcements for select using (
  public.can_manage_semesters()
  or (
    is_active
    and (expires_at is null or expires_at > now())
    and (
      audience = 'everyone'
      or (audience = 'students' and auth.uid() is not null)
      or (audience = 'staff' and public.is_staff_user())
    )
  )
);
drop policy if exists "Staff manage announcements" on public.announcements;
create policy "Staff manage announcements" on public.announcements for all
  using (public.can_manage_semesters()) with check (public.can_manage_semesters());

-- ---------------------------------------------------------------------------
-- New students are automatically part of the current semester.
-- ---------------------------------------------------------------------------
create or replace function public.record_new_student_semester()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'student' and public.current_semester_id() is not null then
    insert into public.student_semester_records (user_id, semester_id, source, full_name, registration_number, course_id)
    values (new.id, public.current_semester_id(), 'registered', new.full_name, new.student_registration_number, new.course_id)
    on conflict (user_id, semester_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists record_new_student_semester on public.users;
create trigger record_new_student_semester after insert on public.users
  for each row execute function public.record_new_student_semester();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Make a semester the current one (the previous current semester is ended).
create or replace function public.start_semester(p_semester_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_semesters() then
    raise exception 'Only admins and coordinators can start a semester';
  end if;
  if not exists (select 1 from public.semesters where id = p_semester_id) then
    raise exception 'Semester not found';
  end if;

  update public.semesters
     set is_current = false,
         status = case when status = 'active' then 'ended' else status end,
         ended_at = case when status = 'active' then coalesce(ended_at, now()) else ended_at end,
         updated_at = now()
   where is_current and id <> p_semester_id;

  update public.semesters
     set is_current = true, status = 'active', ended_at = null, updated_at = now()
   where id = p_semester_id;
end;
$$;

-- Copy course units (and optionally their courseworks, unpublished) between semesters.
create or replace function public.import_course_units(
  p_from_semester uuid,
  p_to_semester uuid,
  p_unit_ids uuid[] default null,
  p_include_courseworks boolean default false
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  src record;
  new_unit_id uuid;
  copied integer := 0;
begin
  if not public.can_manage_semesters() then
    raise exception 'Only admins and coordinators can import course units';
  end if;
  if p_from_semester = p_to_semester then
    raise exception 'Choose a different semester to import from';
  end if;

  for src in
    select * from public.course_units cu
    where cu.semester_id = p_from_semester
      and (p_unit_ids is null or cu.id = any (p_unit_ids))
      and not exists (
        select 1 from public.course_units existing
        where existing.semester_id = p_to_semester and existing.code = cu.code
      )
  loop
    insert into public.course_units (
      code, name, description, course_id, faculty_id, coordinator_id, is_active,
      max_group_size, min_group_size, whatsapp_group_link, source_code, lecturer_id, semester_id
    ) values (
      src.code, src.name, src.description, src.course_id, src.faculty_id, src.coordinator_id, src.is_active,
      src.max_group_size, src.min_group_size, null, src.source_code, src.lecturer_id, p_to_semester
    ) returning id into new_unit_id;

    insert into public.course_unit_faculties (course_unit_id, faculty_id)
    select new_unit_id, faculty_id from public.course_unit_faculties where course_unit_id = src.id
    on conflict do nothing;

    if p_include_courseworks then
      insert into public.courseworks (
        course_unit_id, title, description, type, max_group_size, min_group_size,
        allow_self_formation, is_published, lock_at, work_style, submission_mode
      )
      select new_unit_id, title, description, type, max_group_size, min_group_size,
             allow_self_formation, false, null, work_style, submission_mode
      from public.courseworks where course_unit_id = src.id;
    end if;

    copied := copied + 1;
  end loop;

  return copied;
end;
$$;

-- A returning student confirms their details for the current semester.
create or replace function public.verify_semester_profile(
  p_full_name text,
  p_registration_number text,
  p_course_id uuid,
  p_course_unit_ids uuid[]
)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  sem uuid := public.current_semester_id();
  chosen_course record;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if sem is null then raise exception 'No semester is currently running'; end if;
  if public.student_access_locked() and not public.is_staff_user() then
    raise exception 'The student portal is locked right now';
  end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'Enter your full name'; end if;
  if coalesce(array_length(p_course_unit_ids, 1), 0) = 0 then raise exception 'Choose at least one course unit'; end if;

  select c.id, c.name, c.faculty_id, f.name as faculty_name
    into chosen_course
    from public.courses c left join public.faculties f on f.id = c.faculty_id
   where c.id = p_course_id;
  if chosen_course.id is null then raise exception 'Choose your course'; end if;

  update public.users
     set full_name = trim(p_full_name),
         student_registration_number = nullif(upper(trim(p_registration_number)), ''),
         course_id = chosen_course.id,
         course = chosen_course.name,
         faculty_id = coalesce(chosen_course.faculty_id, faculty_id),
         faculty = coalesce(chosen_course.faculty_name, faculty),
         updated_at = now()
   where id = me;

  insert into public.student_course_units (user_id, course_unit_id, status)
  select me, cu.id, 'active'
    from public.course_units cu
   where cu.id = any (p_course_unit_ids) and cu.semester_id = sem and cu.is_active
  on conflict (user_id, course_unit_id) do update set status = 'active', updated_at = now();

  insert into public.student_semester_records (user_id, semester_id, source, full_name, registration_number, course_id)
  values (me, sem, 'verified', trim(p_full_name), nullif(upper(trim(p_registration_number)), ''), chosen_course.id)
  on conflict (user_id, semester_id) do update
    set source = 'verified', full_name = excluded.full_name,
        registration_number = excluded.registration_number,
        course_id = excluded.course_id, verified_at = now();
end;
$$;

grant execute on function public.current_semester_id() to anon, authenticated;
grant execute on function public.viewing_semester_id() to anon, authenticated;
grant execute on function public.student_access_locked() to anon, authenticated;
grant execute on function public.is_staff_user() to authenticated;
grant execute on function public.can_manage_semesters() to authenticated;
grant execute on function public.start_semester(uuid) to authenticated;
grant execute on function public.import_course_units(uuid, uuid, uuid[], boolean) to authenticated;
grant execute on function public.verify_semester_profile(text, text, uuid, uuid[]) to authenticated;
revoke execute on function public.start_semester(uuid) from anon;
revoke execute on function public.import_course_units(uuid, uuid, uuid[], boolean) from anon;
revoke execute on function public.verify_semester_profile(text, text, uuid, uuid[]) from anon;
