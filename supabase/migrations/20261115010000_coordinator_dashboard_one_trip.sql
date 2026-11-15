-- One request for the whole coordinator/admin dashboard instead of nine.
--
-- SECURITY INVOKER: it runs with the caller's own permissions, so every row-level security
-- policy (including the semester scope) applies exactly as it does for the separate queries
-- it replaces. The JSON shapes match what the dashboard already renders.

create or replace function public.coordinator_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with grouped as (
    select distinct gm.user_id
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where g.status in ('forming', 'active')
  ),
  students as (
    select id, full_name, email, student_registration_number, course, whatsapp_phone
    from public.users
    where role = 'student'
  )
  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'activeCourseUnits', (select count(*) from public.course_units where is_active),
      'totalCourses', (select count(*) from public.courses where is_active),
      'totalStudents', (select count(*) from students),
      'totalGroups', (select count(*) from public.groups where status in ('forming', 'active')),
      'groupedStudents', (select count(*) from grouped),
      'pendingJoinRequests', (select count(*) from public.group_join_requests where status = 'pending')
    ),
    'recentGroups', coalesce((
      select jsonb_agg(row_data order by created_at desc)
      from (
        select g.created_at,
          to_jsonb(g) || jsonb_build_object(
            'coursework', (
              select jsonb_build_object('title', cw.title, 'course_unit',
                (select jsonb_build_object('code', cu.code) from public.course_units cu where cu.id = cw.course_unit_id))
              from public.courseworks cw where cw.id = g.coursework_id
            ),
            'leader', (select jsonb_build_object('full_name', u.full_name) from public.users u where u.id = g.leader_id),
            'members', jsonb_build_array(jsonb_build_object('count', (select count(*) from public.group_members m where m.group_id = g.id)))
          ) as row_data
        from public.groups g
        order by g.created_at desc
        limit 10
      ) recent
    ), '[]'::jsonb),
    'recentCourseworks', coalesce((
      select jsonb_agg(row_data order by created_at desc)
      from (
        select cw.created_at,
          to_jsonb(cw) || jsonb_build_object(
            'course_unit', (select jsonb_build_object('code', cu.code) from public.course_units cu where cu.id = cw.course_unit_id),
            'groups', jsonb_build_array(jsonb_build_object('count', (select count(*) from public.groups g where g.coursework_id = cw.id)))
          ) as row_data
        from public.courseworks cw
        order by cw.created_at desc
        limit 5
      ) recent
    ), '[]'::jsonb),
    'unassignedStudents', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.full_name)
      from (
        select * from students s
        where not exists (select 1 from grouped where grouped.user_id = s.id)
        order by s.full_name
        limit 10
      ) s
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.coordinator_dashboard() from public, anon;
grant execute on function public.coordinator_dashboard() to authenticated;
