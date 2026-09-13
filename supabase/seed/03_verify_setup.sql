-- NEST DATABASE VERIFICATION
-- Run after the schema and seed files.

SELECT CASE
  WHEN to_regclass('public.users') IS NULL THEN 'ERROR: run 00_initial_schema.sql first.'
  ELSE 'Schema tables are available.'
END AS prerequisite_status;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'course_units',
    'courseworks',
    'groups',
    'group_members',
    'group_join_requests',
    'tasks',
    'resources',
    'audit_logs',
    'google_sheets_sync'
  )
ORDER BY table_name;

SELECT CASE
  WHEN COUNT(*) = 10 THEN 'Core NEST tables are present.'
  ELSE 'ERROR: one or more core tables are missing. Run 00_initial_schema.sql first.'
END AS schema_status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'course_units', 'courseworks', 'groups', 'group_members',
    'group_join_requests', 'tasks', 'resources', 'audit_logs', 'google_sheets_sync'
  );

SELECT
  (SELECT COUNT(*) FROM public.users) AS users,
  (SELECT COUNT(*) FROM public.course_units) AS course_units,
  (SELECT COUNT(*) FROM public.courseworks) AS courseworks,
  (SELECT COUNT(*) FROM public.groups) AS groups,
  (SELECT COUNT(*) FROM public.group_members) AS group_members,
  (SELECT COUNT(*) FROM public.tasks) AS tasks;

SELECT * FROM public.dashboard_metrics;
SELECT * FROM public.group_monitor ORDER BY created_at DESC;
