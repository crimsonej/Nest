-- NEST CLEAN BASELINE SEED
-- This script clears stale demo data and rebuilds the actual app baseline.
-- It is intended for the real project schema and uses the actual login format
-- expected by the app.
--
-- Real credentials used by the site:
--   coordinator@nest.edu    -> NestCoordinator123!
--   student1@nest.edu       -> NestStudent123!
--   student2@nest.edu       -> NestStudent123!
--   student3@nest.edu       -> NestStudent123!
--   student4@nest.edu       -> NestStudent123!
--
-- Registration format accepted by the rules:
--   26/2/222/D/2222

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student', 'coordinator', 'lecturer');
  END IF;
END $$;

DO $$
DECLARE
  v_instance_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
      AND table_name = 'users'
  ) THEN
    SELECT id INTO v_instance_id
    FROM auth.instances
    LIMIT 1;

    IF v_instance_id IS NOT NULL THEN
      DELETE FROM auth.identities
      WHERE user_id IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE '%@nest.edu'
      );

      DELETE FROM auth.users
      WHERE email LIKE '%@nest.edu';
    END IF;
  END IF;
END $$;

TRUNCATE TABLE
  public.audit_logs,
  public.group_join_requests,
  public.group_members,
  public.tasks,
  public.resources,
  public.groups,
  public.courseworks,
  public.course_units,
  public.courses,
  public.faculties,
  public.selected_coordinators,
  public.student_course_units,
  public.registration_rules,
  public.universities,
  public.users
RESTART IDENTITY CASCADE;

INSERT INTO public.universities (
  university,
  abbreviation,
  branch,
  location,
  accepted_reg_number_pattern,
  example_reg_number,
  is_active
)
VALUES (
  'Ndejje University',
  'NU',
  'Kampala Campus',
  'Kampala, Uganda',
  '^\\d{2}/\\d{1,2}/\\d{3,4}/[A-Z]/\\d{4}$',
  '26/2/222/D/2222',
  TRUE
)
ON CONFLICT (university) DO UPDATE SET
  abbreviation = EXCLUDED.abbreviation,
  branch = EXCLUDED.branch,
  location = EXCLUDED.location,
  accepted_reg_number_pattern = EXCLUDED.accepted_reg_number_pattern,
  example_reg_number = EXCLUDED.example_reg_number,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.registration_rules (
  university_id,
  faculty_name,
  program_name,
  intake_year,
  delivery_mode,
  accepted_reg_number_pattern,
  example_reg_number,
  is_active
)
SELECT
  id,
  'Faculty of Science and Technology',
  'Computer Science',
  2024,
  'full_time',
  '^\\d{2}/\\d{1,2}/\\d{3,4}/[A-Z]/\\d{4}$',
  '26/2/222/D/2222',
  TRUE
FROM public.universities
WHERE university = 'Ndejje University'
ON CONFLICT (university_id, faculty_name, program_name, intake_year, delivery_mode) DO UPDATE SET
  accepted_reg_number_pattern = EXCLUDED.accepted_reg_number_pattern,
  example_reg_number = EXCLUDED.example_reg_number,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.faculties (code, name, description, is_active)
VALUES
  ('SCI', 'Faculty of Science and Technology', 'Computer and information technology programs.', TRUE),
  ('BUS', 'Faculty of Business and Economics', 'Business and finance programs.', TRUE),
  ('ENG', 'Faculty of Engineering and Built Environment', 'Engineering and built environment programs.', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.courses (faculty_id, code, name, description, is_active)
SELECT f.id, v.code, v.name, v.description, TRUE
FROM public.faculties f
CROSS JOIN (
  VALUES
    ('SCI', 'BSC-CS', 'Bachelor of Science in Computer Science', 'Computer science degree program.'),
    ('SCI', 'BSC-IS', 'Bachelor of Science in Information Systems', 'Information systems degree program.'),
    ('SCI', 'DIT', 'Diploma in Information Technology', 'Information technology diploma program.'),
    ('BUS', 'BBA', 'Bachelor of Business Administration', 'Business administration degree program.'),
    ('ENG', 'BENG-CIV', 'Bachelor of Engineering in Civil Engineering', 'Civil engineering degree program.')
) AS v(faculty_code, code, name, description)
WHERE f.code = v.faculty_code
ON CONFLICT (code) DO UPDATE SET
  faculty_id = EXCLUDED.faculty_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

DO $$
DECLARE
  v_instance_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
      AND table_name = 'users'
  ) THEN
    SELECT id INTO v_instance_id
    FROM auth.instances
    LIMIT 1;

    IF v_instance_id IS NULL THEN
      RAISE NOTICE 'No auth.instance row found; skipping auth user seed';
      RETURN;
    END IF;

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES
      (
        v_instance_id,
        '11111111-1111-4111-8111-111111111111',
        'authenticated',
        'authenticated',
        'coordinator@nest.edu',
        crypt('NestCoordinator123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Dr. Ada Primary","role":"coordinator"}'::jsonb,
        NOW(),
        NOW()
      ),
      (
        v_instance_id,
        '22222222-2222-4222-8222-222222222222',
        'authenticated',
        'authenticated',
        'student1@nest.edu',
        crypt('NestStudent123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Alice Mwangi","role":"student"}'::jsonb,
        NOW(),
        NOW()
      ),
      (
        v_instance_id,
        '33333333-3333-4333-8333-333333333333',
        'authenticated',
        'authenticated',
        'student2@nest.edu',
        crypt('NestStudent123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Brian Otieno","role":"student"}'::jsonb,
        NOW(),
        NOW()
      ),
      (
        v_instance_id,
        '44444444-4444-4444-8444-444444444444',
        'authenticated',
        'authenticated',
        'student3@nest.edu',
        crypt('NestStudent123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Caroline Njeri","role":"student"}'::jsonb,
        NOW(),
        NOW()
      ),
      (
        v_instance_id,
        '55555555-5555-4555-8555-555555555555',
        'authenticated',
        'authenticated',
        'student4@nest.edu',
        crypt('NestStudent123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Daniel Kibet","role":"student"}'::jsonb,
        NOW(),
        NOW()
      )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    SELECT
      u.id::text,
      u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email),
      'email',
      NOW(),
      NOW(),
      NOW()
    FROM auth.users u
    WHERE u.email IN (
      'coordinator@nest.edu',
      'student1@nest.edu',
      'student2@nest.edu',
      'student3@nest.edu',
      'student4@nest.edu'
    )
    ON CONFLICT (provider_id, provider) DO NOTHING;
  ELSE
    RAISE NOTICE 'auth.users table not found; skipping auth user seed';
  END IF;
END $$;

INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  student_registration_number,
  whatsapp_phone,
  faculty,
  course
)
SELECT v.id::uuid,
       v.email,
       v.full_name,
       v.role::user_role,
       v.student_registration_number,
       v.whatsapp_phone,
       v.faculty,
       v.course
FROM (
  VALUES
    ('11111111-1111-4111-8111-111111111111'::uuid, 'coordinator@nest.edu', 'Dr. Ada Primary', 'coordinator', NULL, '+254700000001', 'Faculty of Science and Technology', 'BSC-CS'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'student1@nest.edu', 'Alice Mwangi', 'student', '26/2/222/D/2222', '+254700000002', 'Faculty of Science and Technology', 'BSC-CS'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'student2@nest.edu', 'Brian Otieno', 'student', '26/2/223/D/2223', '+254700000003', 'Faculty of Science and Technology', 'BSC-IS'),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'student3@nest.edu', 'Caroline Njeri', 'student', '26/2/224/D/2224', '+254700000004', 'Faculty of Science and Technology', 'DIT'),
    ('55555555-5555-4555-8555-555555555555'::uuid, 'student4@nest.edu', 'Daniel Kibet', 'student', '26/2/225/D/2225', '+254700000005', 'Faculty of Science and Technology', 'BSC-CS')
) AS v(id, email, full_name, role, student_registration_number, whatsapp_phone, faculty, course)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = v.id)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  student_registration_number = EXCLUDED.student_registration_number,
  whatsapp_phone = EXCLUDED.whatsapp_phone,
  faculty = EXCLUDED.faculty,
  course = EXCLUDED.course,
  updated_at = NOW();

WITH course_lookup AS (
  SELECT id, code FROM public.courses
)
UPDATE public.users u
SET faculty_id = c.faculty_id,
    course_id = c.id,
    updated_at = NOW()
FROM public.courses c
WHERE u.role = 'student'
  AND COALESCE(u.course, '') = c.code;

UPDATE public.users u
SET faculty_id = c.faculty_id,
    course_id = c.id,
    updated_at = NOW()
FROM public.courses c
WHERE u.email = 'coordinator@nest.edu'
  AND c.code = 'BSC-CS';

INSERT INTO public.course_units (code, name, description, course_id, coordinator_id, is_active, max_group_size, min_group_size)
SELECT 'CS101', 'Introduction to Programming', 'Foundations of programming and software problem solving.', c.id, u.id, TRUE, 5, 2
FROM public.courses c
JOIN public.users u ON u.email = 'coordinator@nest.edu'
WHERE c.code = 'BSC-CS'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  course_id = EXCLUDED.course_id,
  coordinator_id = EXCLUDED.coordinator_id,
  is_active = EXCLUDED.is_active,
  max_group_size = EXCLUDED.max_group_size,
  min_group_size = EXCLUDED.min_group_size,
  updated_at = NOW();

INSERT INTO public.courseworks (course_unit_id, title, description, type, max_group_size, min_group_size, allow_self_formation, is_published, lock_at)
SELECT cu.id, 'Group Assignment 1', 'Create and manage a project group for the first software assignment.', 'assignment', 5, 2, TRUE, TRUE, NOW() + INTERVAL '7 days'
FROM public.course_units cu
WHERE cu.code = 'CS101'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.groups (coursework_id, name, description, leader_id, is_private, status, max_members)
SELECT cw.id, 'LogicLoop', 'A programming group for assignment one.', u.id, FALSE, 'active', 5
FROM public.courseworks cw
JOIN public.users u ON u.email = 'student1@nest.edu'
WHERE cw.title = 'Group Assignment 1'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.group_members (group_id, user_id, role)
SELECT g.id, u.id, 'leader'
FROM public.groups g
JOIN public.users u ON u.email = 'student1@nest.edu'
WHERE g.name = 'LogicLoop'
UNION ALL
SELECT g.id, u.id, 'member'
FROM public.groups g
JOIN public.users u ON u.email = 'student2@nest.edu'
WHERE g.name = 'LogicLoop'
UNION ALL
SELECT g.id, u.id, 'member'
FROM public.groups g
JOIN public.users u ON u.email = 'student3@nest.edu'
WHERE g.name = 'LogicLoop'
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.tasks (group_id, user_id, coursework_id, title, description, status, priority, due_date)
SELECT g.id, u.id, cw.id, 'Plan program structure', 'Create the class design and discuss program input/output flow.', 'in_progress', 'high', NOW() + INTERVAL '2 days'
FROM public.groups g
JOIN public.courseworks cw ON cw.title = 'Group Assignment 1'
JOIN public.users u ON u.email = 'student1@nest.edu'
WHERE g.name = 'LogicLoop'
ON CONFLICT (id) DO NOTHING;

SELECT 'auth_users' AS check_name, COUNT(*) AS row_count
FROM auth.users
WHERE email IN (
  'coordinator@nest.edu',
  'student1@nest.edu',
  'student2@nest.edu',
  'student3@nest.edu',
  'student4@nest.edu'
)
UNION ALL
SELECT 'public_users', COUNT(*)
FROM public.users
WHERE email IN (
  'coordinator@nest.edu',
  'student1@nest.edu',
  'student2@nest.edu',
  'student3@nest.edu',
  'student4@nest.edu'
);
