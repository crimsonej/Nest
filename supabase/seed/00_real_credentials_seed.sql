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

-- IMPORTANT:
-- This seed is intentionally idempotent and must not delete or truncate live auth/public tables.
-- In production or shared Supabase projects, destructive resets require database-owner privileges
-- and should be handled with a dedicated reset workflow, not by app SQL.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
      AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'Auth users table detected; continuing with idempotent seed updates.';
  END IF;
END $$;

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

-- Guard against re-running the seed in a live project without wiping data.
-- This keeps the script safe for existing rows and avoids the ownership errors triggered by destructive table resets.

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

-- Fill the missing user metadata fields and expand the live seed to a realistic baseline of 50 profiles.
UPDATE public.users
SET gender = CASE
  WHEN gender IS NULL AND full_name ILIKE '%a%' THEN 'female'
  WHEN gender IS NULL AND full_name ILIKE '%o%' THEN 'male'
  ELSE gender
END,
    status = COALESCE(status, 'normal'),
    university = COALESCE(university, 'Ndejje University'),
    updated_at = NOW()
WHERE gender IS NULL OR status IS NULL OR university IS NULL;

WITH seed_students AS (
  SELECT * FROM (
    VALUES
      ('Alice Mwangi', 'female', '26/2/222/D/2222', '+254700000002', 'student1@nest.edu'),
      ('Brian Otieno', 'male', '26/2/223/D/2223', '+254700000003', 'student2@nest.edu'),
      ('Caroline Njeri', 'female', '26/2/224/D/2224', '+254700000004', 'student3@nest.edu'),
      ('Daniel Kibet', 'male', '26/2/225/D/2225', '+254700000005', 'student4@nest.edu'),
      ('Faith Achieng', 'female', '26/2/226/D/2226', '+254700000006', 'student5@nest.edu'),
      ('George Wambua', 'male', '26/2/227/D/2227', '+254700000007', 'student6@nest.edu'),
      ('Hannah Muwonge', 'female', '26/2/228/D/2228', '+254700000008', 'student7@nest.edu'),
      ('Isaac Kato', 'male', '26/2/229/D/2229', '+254700000009', 'student8@nest.edu'),
      ('Joy Namuddu', 'female', '26/2/230/D/2230', '+254700000010', 'student9@nest.edu'),
      ('Kevin Mwesigwa', 'male', '26/2/231/D/2231', '+254700000011', 'student10@nest.edu'),
      ('Lilian Nansubuga', 'female', '26/2/232/D/2232', '+254700000012', 'student11@nest.edu'),
      ('Martin Ouma', 'male', '26/2/233/D/2233', '+254700000013', 'student12@nest.edu'),
      ('Naomi Kisa', 'female', '26/2/234/D/2234', '+254700000014', 'student13@nest.edu'),
      ('Oliver Nabulya', 'male', '26/2/235/D/2235', '+254700000015', 'student14@nest.edu'),
      ('Priscilla Auma', 'female', '26/2/236/D/2236', '+254700000016', 'student15@nest.edu'),
      ('Quentin Ssebagala', 'male', '26/2/237/D/2237', '+254700000017', 'student16@nest.edu'),
      ('Ruth Nakibuuka', 'female', '26/2/238/D/2238', '+254700000018', 'student17@nest.edu'),
      ('Samuel Kibirige', 'male', '26/2/239/D/2239', '+254700000019', 'student18@nest.edu'),
      ('Tina Ssentongo', 'female', '26/2/240/D/2240', '+254700000020', 'student19@nest.edu'),
      ('Umar Muli', 'male', '26/2/241/D/2241', '+254700000021', 'student20@nest.edu'),
      ('Violet Nanyonga', 'female', '26/2/242/D/2242', '+254700000022', 'student21@nest.edu'),
      ('Walter Kiwanuka', 'male', '26/2/243/D/2243', '+254700000023', 'student22@nest.edu'),
      ('Xavier Nalubega', 'male', '26/2/244/D/2244', '+254700000024', 'student23@nest.edu'),
      ('Yvonne Nampijja', 'female', '26/2/245/D/2245', '+254700000025', 'student24@nest.edu'),
      ('Zainab Mirembe', 'female', '26/2/246/D/2246', '+254700000026', 'student25@nest.edu'),
      ('Abel Atukunda', 'male', '26/2/247/D/2247', '+254700000027', 'student26@nest.edu'),
      ('Betty Ayebare', 'female', '26/2/248/D/2248', '+254700000028', 'student27@nest.edu'),
      ('Collins Atwine', 'male', '26/2/249/D/2249', '+254700000029', 'student28@nest.edu'),
      ('Diana Namatovu', 'female', '26/2/250/D/2250', '+254700000030', 'student29@nest.edu'),
      ('Ethan Mugisha', 'male', '26/2/251/D/2251', '+254700000031', 'student30@nest.edu'),
      ('Flora Nakitto', 'female', '26/2/252/D/2252', '+254700000032', 'student31@nest.edu'),
      ('Godfrey Lule', 'male', '26/2/253/D/2253', '+254700000033', 'student32@nest.edu'),
      ('Hellen Nabirye', 'female', '26/2/254/D/2254', '+254700000034', 'student33@nest.edu'),
      ('Ian Muwanga', 'male', '26/2/255/D/2255', '+254700000035', 'student34@nest.edu'),
      ('Janet Akello', 'female', '26/2/256/D/2256', '+254700000036', 'student35@nest.edu'),
      ('Kenneth Okwir', 'male', '26/2/257/D/2257', '+254700000037', 'student36@nest.edu'),
      ('Lucy Nampeera', 'female', '26/2/258/D/2258', '+254700000038', 'student37@nest.edu'),
      ('Michael Okello', 'male', '26/2/259/D/2259', '+254700000039', 'student38@nest.edu'),
      ('Nadia Nakitende', 'female', '26/2/260/D/2260', '+254700000040', 'student39@nest.edu'),
      ('Oscar Bwengye', 'male', '26/2/261/D/2261', '+254700000041', 'student40@nest.edu'),
      ('Patricia Katuura', 'female', '26/2/262/D/2262', '+254700000042', 'student41@nest.edu'),
      ('Qadir Waiswa', 'male', '26/2/263/D/2263', '+254700000043', 'student42@nest.edu'),
      ('Rita Byaruhanga', 'female', '26/2/264/D/2264', '+254700000044', 'student43@nest.edu'),
      ('Stephen Kizza', 'male', '26/2/265/D/2265', '+254700000045', 'student44@nest.edu'),
      ('Tracy Nampala', 'female', '26/2/266/D/2266', '+254700000046', 'student45@nest.edu'),
      ('Uriel Ssekyewa', 'male', '26/2/267/D/2267', '+254700000047', 'student46@nest.edu'),
      ('Vivian Masaba', 'female', '26/2/268/D/2268', '+254700000048', 'student47@nest.edu'),
      ('Winston Kankya', 'male', '26/2/269/D/2269', '+254700000049', 'student48@nest.edu'),
      ('Yasmin Nyakato', 'female', '26/2/270/D/2270', '+254700000050', 'student49@nest.edu'),
      ('Zakariya Kirabo', 'male', '26/2/271/D/2271', '+254700000051', 'student50@nest.edu')
  ) AS v(full_name, gender, student_registration_number, whatsapp_phone, email)
),
student_auth_rows AS (
  SELECT
    COALESCE(au.id, gen_random_uuid()) AS id,
    sd.email,
    sd.full_name,
    sd.gender,
    sd.student_registration_number,
    sd.whatsapp_phone
  FROM seed_students sd
  LEFT JOIN auth.users au ON au.email = sd.email
  WHERE au.id IS NULL
)
INSERT INTO auth.users (
  id,
  instance_id,
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
SELECT
  sar.id,
  (SELECT id FROM auth.instances LIMIT 1),
  'authenticated',
  'authenticated',
  sar.email,
  crypt('NestStudent123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', sar.full_name, 'role', 'student', 'gender', sar.gender)::jsonb,
  NOW(),
  NOW()
FROM student_auth_rows sar
ON CONFLICT (id) DO NOTHING;

UPDATE public.users u
SET faculty_id = c.faculty_id,
    course_id = c.id,
    university_id = univ.id,
    updated_at = NOW()
FROM public.courses c
JOIN public.faculties f ON f.id = c.faculty_id
JOIN public.universities univ ON univ.university = 'Ndejje University'
WHERE u.role = 'student' AND (u.course = c.code OR u.course = c.name)
  AND u.faculty_id IS NULL;
