-- Create dedicated lecturers table for NEST
-- Stores lecturer-specific profile details: name, email, phone_number, course_unit_id, faculty_id

-- Enable pgcrypto for crypt() and gen_salt() (password hashing)
create extension if not exists pgcrypto;

-- 1. Create public.lecturers table
create table if not exists public.lecturers (
  id uuid primary key default gen_random_uuid() references public.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone_number text,
  course_unit_id uuid references public.course_units(id) on delete set null,
  faculty_id uuid references public.faculties(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.lecturers is 'Dedicated table storing lecturer profile details and course unit / faculty assignments.';

-- 2. Indexes for performance
create index if not exists lecturers_course_unit_id_idx on public.lecturers(course_unit_id);
create index if not exists lecturers_faculty_id_idx on public.lecturers(faculty_id);

-- 3. Enable RLS
alter table public.lecturers enable row level security;

-- 4. RLS Policies
drop policy if exists "Lecturers can view own record" on public.lecturers;
create policy "Lecturers can view own record"
  on public.lecturers for select
  using (id = auth.uid());

drop policy if exists "Admins and coordinators can manage lecturers" on public.lecturers;
create policy "Admins and coordinators can manage lecturers"
  on public.lecturers for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'coordinator')
    )
  );

-- 5. BEFORE INSERT trigger: Ensure id, auth.users, and public.users exist before inserting into public.lecturers
create or replace function public.prepare_lecturer_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_auth_id uuid;
begin
  -- 5a. Ensure new.id is set
  if new.id is null then
    select id into existing_auth_id from auth.users where email = new.email limit 1;
    if existing_auth_id is not null then
      new.id := existing_auth_id;
    else
      new.id := gen_random_uuid();
    end if;
  end if;

  -- 5b. Create user in auth.users if missing (Default login password: 'Lecturer123!')
  if not exists (select 1 from auth.users where id = new.id or email = new.email) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      new.id,
      'authenticated',
      'authenticated',
      new.email,
      crypt('Lecturer123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', new.name),
      now(), now()
    );
  end if;

  -- 5c. Ensure profile exists in public.users
  insert into public.users (id, full_name, email, role, phone_number, faculty_id, status)
  values (new.id, new.name, new.email, 'lecturer', new.phone_number, new.faculty_id, 'verified')
  on conflict (id) do update
  set role = 'lecturer',
      full_name = excluded.full_name,
      email = excluded.email,
      phone_number = coalesce(excluded.phone_number, public.users.phone_number),
      faculty_id = coalesce(excluded.faculty_id, public.users.faculty_id);

  return new;
end;
$$;

drop trigger if exists before_lecturer_insert on public.lecturers;
create trigger before_lecturer_insert
before insert on public.lecturers
for each row execute function public.prepare_lecturer_account();

-- 6. AFTER INSERT/UPDATE trigger: Keep course_units.lecturer_id in sync
create or replace function public.sync_lecturer_course_unit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.course_unit_id is not null then
    -- Unassign previous course unit if changed
    update public.course_units
    set lecturer_id = null
    where lecturer_id = new.id and id <> new.course_unit_id;

    -- Assign new course unit
    update public.course_units
    set lecturer_id = new.id
    where id = new.course_unit_id;
  end if;

  return new;
end;
$$;

drop trigger if exists after_lecturer_upsert on public.lecturers;
create trigger after_lecturer_upsert
after insert or update on public.lecturers
for each row execute function public.sync_lecturer_course_unit();

-- 7. Helper function to get course unit ID for current lecturer
create or replace function public.get_lecturer_course_unit_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select course_unit_id from public.lecturers where id = auth.uid() limit 1),
    (select id from public.course_units where lecturer_id = auth.uid() limit 1)
  );
$$;

grant execute on function public.get_lecturer_course_unit_id() to anon, authenticated;
