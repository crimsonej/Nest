-- Seed course units for NEST
-- Run this after creating the auth users in Supabase Auth.
-- This file is safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
      AND table_name IN ('instances', 'users')
  ) THEN
    RAISE NOTICE 'Supabase Auth is not initialized. Skipping course-unit seed.';
    RETURN;
  END IF;
END $$;

INSERT INTO public.course_units (id, code, name, description, course_id, coordinator_id, is_active, max_group_size, min_group_size)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'CS101',
    'Introduction to Programming',
    'First-year introductory programming course.',
    '88888888-8888-4888-8888-888888888888',
    '22222222-2222-4222-8222-222222222222',
    true,
    5,
    2
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'CS201',
    'Data Structures',
    'Core data structures and algorithm analysis.',
    '88888888-8888-4888-8888-888888888888',
    '22222222-2222-4222-8222-222222222222',
    true,
    5,
    2
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'DB301',
    'Database Systems',
    'Relational database design and SQL.',
    '88888888-8888-4888-8888-888888888888',
    '22222222-2222-4222-8222-222222222222',
    true,
    4,
    2
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  course_id = EXCLUDED.course_id,
  coordinator_id = EXCLUDED.coordinator_id,
  is_active = EXCLUDED.is_active,
  max_group_size = EXCLUDED.max_group_size,
  min_group_size = EXCLUDED.min_group_size,
  updated_at = NOW();

INSERT INTO public.courseworks (
  id,
  course_unit_id,
  title,
  description,
  type,
  max_group_size,
  min_group_size,
  allow_self_formation,
  is_published,
  lock_at
)
VALUES
  (
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    'Java Basics Assignment',
    'Build a simple class-based program with file input/output.',
    'assignment',
    5,
    2,
    true,
    true,
    NOW() + INTERVAL '7 days'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '33333333-3333-4333-8333-333333333333',
    'Tree Project',
    'Implement tree traversal and data structure comparison.',
    'project',
    5,
    2,
    true,
    true,
    NOW() + INTERVAL '10 days'
  )
ON CONFLICT (id) DO UPDATE SET
  course_unit_id = EXCLUDED.course_unit_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  max_group_size = EXCLUDED.max_group_size,
  min_group_size = EXCLUDED.min_group_size,
  allow_self_formation = EXCLUDED.allow_self_formation,
  is_published = EXCLUDED.is_published,
  lock_at = EXCLUDED.lock_at,
  updated_at = NOW();
