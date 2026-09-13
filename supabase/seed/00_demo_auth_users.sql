-- NEST DEMO AUTH USERS
-- Run this in Supabase SQL Editor before 01_course_units.sql and 02_users_and_groups.sql.
-- These are demo accounts only. Change the passwords before using a real deployment.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
      AND table_name IN ('instances', 'users')
  ) THEN
    RAISE NOTICE 'Supabase Auth is not initialized in this database. Skipping demo auth creation.';
    RETURN;
  END IF;
END $$;

-- Repair users created by an earlier version of this file. Supabase Auth
-- requires the real project instance ID and an email identity for password login.
UPDATE auth.users
SET instance_id = (SELECT id FROM auth.instances LIMIT 1)
WHERE email IN (
  'coordinator@nest.edu',
  'student1@nest.edu',
  'student2@nest.edu',
  'student3@nest.edu',
  'student4@nest.edu'
)
OR email ~ '^student[0-9]+@nest\.edu$';

-- Demo login credentials:
-- Coordinator: coordinator@nest.edu / NestCoordinator123!
-- Student 1:   student1@nest.edu      / NestStudent123!
-- Student 2:   student2@nest.edu      / NestStudent123!
-- Student 3:   student3@nest.edu      / NestStudent123!
-- Student 4:   student4@nest.edu      / NestStudent123!
-- Students 5-49 use the same demo password: NestStudent123!

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
    (SELECT id FROM auth.instances LIMIT 1),
    '22222222-2222-4222-8222-222222222222',
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
    (SELECT id FROM auth.instances LIMIT 1),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
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
    (SELECT id FROM auth.instances LIMIT 1),
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
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
    (SELECT id FROM auth.instances LIMIT 1),
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
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
    (SELECT id FROM auth.instances LIMIT 1),
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
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

-- Add students 5 through 49 so the demo database has 50 profiles in total.
DO $$
DECLARE
  student_number INTEGER;
  student_email TEXT;
  student_id UUID;
BEGIN
  FOR student_number IN 5..49 LOOP
    student_email := 'student' || student_number || '@nest.edu';
    student_id := uuid_generate_v5(uuid_ns_url(), student_email);

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    )
    VALUES (
      (SELECT id FROM auth.instances LIMIT 1),
      student_id,
      'authenticated',
      'authenticated',
      student_email,
      crypt('NestStudent123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Student ' || student_number, 'role', 'student'),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;

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
OR u.email ~ '^student[0-9]+@nest\.edu$'
ON CONFLICT (provider_id, provider) DO NOTHING;

-- The auth trigger creates public.users automatically. This makes the file
-- safe to run again if the profiles already exist.
UPDATE public.users
SET role = CASE
      WHEN email = 'coordinator@nest.edu' THEN 'coordinator'::user_role
      ELSE 'student'::user_role
    END,
    full_name = CASE email
      WHEN 'coordinator@nest.edu' THEN 'Dr. Ada Primary'
      WHEN 'student1@nest.edu' THEN 'Alice Mwangi'
      WHEN 'student2@nest.edu' THEN 'Brian Otieno'
      WHEN 'student3@nest.edu' THEN 'Caroline Njeri'
      WHEN 'student4@nest.edu' THEN 'Daniel Kibet'
      ELSE full_name
    END
WHERE email IN (
  'coordinator@nest.edu',
  'student1@nest.edu',
  'student2@nest.edu',
  'student3@nest.edu',
  'student4@nest.edu'
);

UPDATE public.users
SET student_registration_number = 'CS24' || LPAD(SUBSTRING(email FROM 'student([0-9]+)')::TEXT, 3, '0'),
    faculty = 'Faculty of Science and Technology',
    course = 'BSC-CS'
WHERE email ~ '^student[0-9]+@nest\.edu$';
