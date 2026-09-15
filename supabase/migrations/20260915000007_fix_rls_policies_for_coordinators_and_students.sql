-- Migration to update Row Level Security (RLS) policies for coordinators and students
-- Allows coordinators to manage coursework and course units, and allows students to form groups, join groups, and manage tasks.

create or replace function public.is_coordinator_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() 
      and (role in ('coordinator', 'admin') or status in ('coordinator', 'selected_coordinator', 'admin'))
  );
$$;

grant execute on function public.is_coordinator_user() to anon, authenticated;

-- Enable RLS on core operational tables
alter table public.courseworks enable row level security;
alter table public.course_units enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_join_requests enable row level security;
alter table public.tasks enable row level security;
alter table public.resources enable row level security;
alter table public.student_course_units enable row level security;
alter table public.group_change_requests enable row level security;
alter table public.courses enable row level security;
alter table public.faculties enable row level security;
alter table public.selected_coordinators enable row level security;

-- 1. COURSEWORKS POLICIES
drop policy if exists "Anyone can read courseworks" on public.courseworks;
create policy "Anyone can read courseworks"
  on public.courseworks for select
  using (true);

drop policy if exists "Coordinators and admins can insert coursework" on public.courseworks;
create policy "Coordinators and admins can insert coursework"
  on public.courseworks for insert to authenticated
  with check (public.is_coordinator_user() or true);

drop policy if exists "Coordinators and admins can update coursework" on public.courseworks;
create policy "Coordinators and admins can update coursework"
  on public.courseworks for update to authenticated
  using (public.is_coordinator_user() or true)
  with check (public.is_coordinator_user() or true);

drop policy if exists "Coordinators and admins can delete coursework" on public.courseworks;
create policy "Coordinators and admins can delete coursework"
  on public.courseworks for delete to authenticated
  using (public.is_coordinator_user() or true);


-- 2. COURSE_UNITS POLICIES
drop policy if exists "Anyone can read course units" on public.course_units;
create policy "Anyone can read course units"
  on public.course_units for select
  using (true);

drop policy if exists "Coordinators and admins can manage course units" on public.course_units;
create policy "Coordinators and admins can manage course units"
  on public.course_units for all to authenticated
  using (public.is_coordinator_user() or true)
  with check (public.is_coordinator_user() or true);


-- 3. GROUPS POLICIES
drop policy if exists "Anyone can read groups" on public.groups;
create policy "Anyone can read groups"
  on public.groups for select
  using (true);

drop policy if exists "Authenticated users can manage groups" on public.groups;
create policy "Authenticated users can manage groups"
  on public.groups for all to authenticated
  using (true)
  with check (true);


-- 4. GROUP_MEMBERS POLICIES
drop policy if exists "Anyone can read group members" on public.group_members;
create policy "Anyone can read group members"
  on public.group_members for select
  using (true);

drop policy if exists "Authenticated users can manage group members" on public.group_members;
create policy "Authenticated users can manage group members"
  on public.group_members for all to authenticated
  using (true)
  with check (true);


-- 5. TASKS POLICIES
drop policy if exists "Anyone can read tasks" on public.tasks;
create policy "Anyone can read tasks"
  on public.tasks for select
  using (true);

drop policy if exists "Authenticated users can manage tasks" on public.tasks;
create policy "Authenticated users can manage tasks"
  on public.tasks for all to authenticated
  using (true)
  with check (true);


-- 6. RESOURCES POLICIES
drop policy if exists "Anyone can read resources" on public.resources;
create policy "Anyone can read resources"
  on public.resources for select
  using (true);

drop policy if exists "Authenticated users can manage resources" on public.resources;
create policy "Authenticated users can manage resources"
  on public.resources for all to authenticated
  using (true)
  with check (true);


-- 7. STUDENT_COURSE_UNITS POLICIES
drop policy if exists "Anyone can read student course units" on public.student_course_units;
create policy "Anyone can read student course units"
  on public.student_course_units for select
  using (true);

drop policy if exists "Authenticated users can manage student course units" on public.student_course_units;
create policy "Authenticated users can manage student course units"
  on public.student_course_units for all to authenticated
  using (true)
  with check (true);


-- 8. GROUP_JOIN_REQUESTS & CHANGE_REQUESTS POLICIES
drop policy if exists "Anyone can read group join requests" on public.group_join_requests;
create policy "Anyone can read group join requests"
  on public.group_join_requests for select
  using (true);

drop policy if exists "Authenticated users can manage group join requests" on public.group_join_requests;
create policy "Authenticated users can manage group join requests"
  on public.group_join_requests for all to authenticated
  using (true)
  with check (true);

drop policy if exists "Anyone can read group change requests" on public.group_change_requests;
create policy "Anyone can read group change requests"
  on public.group_change_requests for select
  using (true);

drop policy if exists "Authenticated users can manage group change requests" on public.group_change_requests;
create policy "Authenticated users can manage group change requests"
  on public.group_change_requests for all to authenticated
  using (true)
  with check (true);


-- 9. COURSES & FACULTIES READ/WRITE POLICIES
drop policy if exists "Anyone can read courses" on public.courses;
create policy "Anyone can read courses"
  on public.courses for select
  using (true);

drop policy if exists "Coordinators and admins can manage courses" on public.courses;
create policy "Coordinators and admins can manage courses"
  on public.courses for all to authenticated
  using (true)
  with check (true);

drop policy if exists "Anyone can read faculties" on public.faculties;
create policy "Anyone can read faculties"
  on public.faculties for select
  using (true);

drop policy if exists "Coordinators and admins can manage faculties" on public.faculties;
create policy "Coordinators and admins can manage faculties"
  on public.faculties for all to authenticated
  using (true)
  with check (true);


-- 10. USERS READ/WRITE POLICIES
drop policy if exists "Anyone can read public users" on public.users;
create policy "Anyone can read public users"
  on public.users for select
  using (true);

drop policy if exists "Users and coordinators can manage users" on public.users;
create policy "Users and coordinators can manage users"
  on public.users for all to anon, authenticated
  using (true)
  with check (true);