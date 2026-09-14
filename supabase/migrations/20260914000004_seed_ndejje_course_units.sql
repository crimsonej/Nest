-- Repair seed for Ndejje course units. The original seed used an inner
-- coordinator lookup, which silently inserted zero rows when no coordinator
-- existed yet.

alter table public.course_units
  add column if not exists source_code text,
  add column if not exists course_id uuid;

do $$
declare
  coordinator_id uuid;
  dit_course_id uuid;
begin
  select id into coordinator_id
  from public.users
  where role = 'coordinator' or status = 'coordinator'
  order by created_at
  limit 1;

  if coordinator_id is null then
    raise exception 'Cannot seed course units: create at least one coordinator profile first.';
  end if;

  select id into dit_course_id
  from public.courses
  where code = 'DIT' and is_active = true
  limit 1;

  if dit_course_id is null then
    raise exception 'Cannot seed course units: the DIT course does not exist.';
  end if;

  insert into public.course_units (
    code,
    source_code,
    name,
    course_id,
    coordinator_id,
    is_active
  )
  values
    ('1101-CE', '1101', 'Christian Ethics', dit_course_id, coordinator_id, true),
    ('1104-MIT', '1104', 'Mathematics for IT', dit_course_id, coordinator_id, true),
    ('1103-ED', '1103', 'Entrepreneurship & Development', dit_course_id, coordinator_id, true),
    ('1104-IT', '1104', 'Introduction to Information Technology', dit_course_id, coordinator_id, true),
    ('1106-FIS', '1106', 'Fundamentals of Information Systems', dit_course_id, coordinator_id, true),
    ('1108', '1108', 'Cisco', dit_course_id, coordinator_id, true),
    ('1109', '1109', 'Huawei', dit_course_id, coordinator_id, true),
    ('1101-PP', '1101', 'Principles of Programming', dit_course_id, coordinator_id, true),
    ('1102-CS', '1102', 'Communication Skills', dit_course_id, coordinator_id, true)
  on conflict (code) do update
  set source_code = excluded.source_code,
      name = excluded.name,
      course_id = excluded.course_id,
      coordinator_id = excluded.coordinator_id,
      is_active = true;
end;
$$;