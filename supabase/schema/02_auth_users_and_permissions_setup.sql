-- ============================================================
-- NEST: Complete Auth & User Seeding Script (v3)
-- Run this in: Supabase Dashboard → SQL Editor
-- This script creates Supabase Auth users AND matching public profiles.
-- ============================================================

-- Step 1: Temporarily disable the new-user trigger if present to avoid conflicts
-- (We will insert public.users manually with full data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    BEGIN
      EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER TABLE public.users DISABLE TRIGGER on_auth_user_created;';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- Step 1.5: Clean up existing records with demo emails to avoid unique constraint conflicts
DELETE FROM auth.identities WHERE provider_id IN (
  'coordinator@nest.edu',
  'student1@nest.edu',
  'student2@nest.edu',
  'student3@nest.edu',
  'selected_coord@nest.edu',
  'student4@nest.edu',
  'student5@nest.edu',
  'student6@nest.edu',
  'coordinator2@nest.edu',
  'student7@nest.edu'
);

DELETE FROM public.users WHERE email IN (
  'coordinator@nest.edu',
  'student1@nest.edu',
  'student2@nest.edu',
  'student3@nest.edu',
  'selected_coord@nest.edu',
  'student4@nest.edu',
  'student5@nest.edu',
  'student6@nest.edu',
  'coordinator2@nest.edu',
  'student7@nest.edu'
);

DELETE FROM auth.users WHERE email IN (
  'coordinator@nest.edu',
  'student1@nest.edu',
  'student2@nest.edu',
  'student3@nest.edu',
  'selected_coord@nest.edu',
  'student4@nest.edu',
  'student5@nest.edu',
  'student6@nest.edu',
  'coordinator2@nest.edu',
  'student7@nest.edu'
);

-- Step 2: Insert auth users directly into auth.users
-- Passwords are bcrypt hashed:
--   NestCoordinator123! → use pgcrypto to hash below
--   NestStudent123!     → use pgcrypto to hash below

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
  updated_at,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
-- Coordinator
(
  '11111111-1111-4111-8111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'coordinator@nest.edu',
  crypt('NestCoordinator123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Dr. James Ochieng","role":"coordinator"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
),
-- Student 1
(
  '22222222-2222-4222-8222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'student1@nest.edu',
  crypt('NestStudent123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Alice Mwangi","role":"student"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
),
-- Student 2
(
  '33333333-3333-4333-8333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'student2@nest.edu',
  crypt('NestStudent123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Brian Kamau","role":"student"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
),
-- Student 3
(
  '44444444-4444-4444-8444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'student3@nest.edu',
  crypt('NestStudent123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Carol Achieng","role":"student"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
),
-- Student 4 (Selected Coordinator role)
(
  '55555555-5555-4555-8555-555555555555',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'selected_coord@nest.edu',
  crypt('NestStudent123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"David Njoroge","role":"student"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
),
-- Student 5
(
  '66666666-6666-4666-8666-666666666666',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'student4@nest.edu',
  crypt('NestStudent123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Esther Nakato","role":"student"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
),
-- Student 6
(
  '77777777-7777-4777-8777-777777777777',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'student5@nest.edu',
  crypt('NestStudent123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Francis Okello","role":"student"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
),
-- Student 7 (Selected Coordinator)
(
  '88888888-8888-4888-8888-888888888888',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'student6@nest.edu',
  crypt('NestStudent123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Grace Wanjiku","role":"student"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
),
-- Coordinator 2
(
  '99999999-9999-4999-8999-999999999999',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'coordinator2@nest.edu',
  crypt('NestCoordinator123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Prof. Sarah Tumusiime","role":"coordinator"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
),
-- Student 8
(
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'student7@nest.edu',
  crypt('NestStudent123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Henry Mukasa","role":"student"}',
  NOW(),
  NOW(),
  FALSE,
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  email              = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at         = NOW();

-- Also insert identities (required for email/password login to work)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
(
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'coordinator@nest.edu',
  'email',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"coordinator@nest.edu"}',
  NOW(), NOW(), NOW()
),
(
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'student1@nest.edu',
  'email',
  '{"sub":"22222222-2222-4222-8222-222222222222","email":"student1@nest.edu"}',
  NOW(), NOW(), NOW()
),
(
  '33333333-3333-4333-8333-333333333333',
  '33333333-3333-4333-8333-333333333333',
  'student2@nest.edu',
  'email',
  '{"sub":"33333333-3333-4333-8333-333333333333","email":"student2@nest.edu"}',
  NOW(), NOW(), NOW()
),
(
  '44444444-4444-4444-8444-444444444444',
  '44444444-4444-4444-8444-444444444444',
  'student3@nest.edu',
  'email',
  '{"sub":"44444444-4444-4444-8444-444444444444","email":"student3@nest.edu"}',
  NOW(), NOW(), NOW()
),
(
  '55555555-5555-4555-8555-555555555555',
  '55555555-5555-4555-8555-555555555555',
  'selected_coord@nest.edu',
  'email',
  '{"sub":"55555555-5555-4555-8555-555555555555","email":"selected_coord@nest.edu"}',
  NOW(), NOW(), NOW()
),
(
  '66666666-6666-4666-8666-666666666666',
  '66666666-6666-4666-8666-666666666666',
  'student4@nest.edu',
  'email',
  '{"sub":"66666666-6666-4666-8666-666666666666","email":"student4@nest.edu"}',
  NOW(), NOW(), NOW()
),
(
  '77777777-7777-4777-8777-777777777777',
  '77777777-7777-4777-8777-777777777777',
  'student5@nest.edu',
  'email',
  '{"sub":"77777777-7777-4777-8777-777777777777","email":"student5@nest.edu"}',
  NOW(), NOW(), NOW()
),
(
  '88888888-8888-4888-8888-888888888888',
  '88888888-8888-4888-8888-888888888888',
  'student6@nest.edu',
  'email',
  '{"sub":"88888888-8888-4888-8888-888888888888","email":"student6@nest.edu"}',
  NOW(), NOW(), NOW()
),
(
  '99999999-9999-4999-8999-999999999999',
  '99999999-9999-4999-8999-999999999999',
  'coordinator2@nest.edu',
  'email',
  '{"sub":"99999999-9999-4999-8999-999999999999","email":"coordinator2@nest.edu"}',
  NOW(), NOW(), NOW()
),
(
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'student7@nest.edu',
  'email',
  '{"sub":"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee","email":"student7@nest.edu"}',
  NOW(), NOW(), NOW()
)
ON CONFLICT (provider, provider_id) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  updated_at    = NOW();

-- Step 3: Upsert public.users profiles (full data)
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  student_registration_number,
  whatsapp_phone,
  university,
  faculty,
  course,
  status,
  selected_coordinator
) VALUES
(
  '11111111-1111-4111-8111-111111111111',
  'coordinator@nest.edu',
  'Dr. James Ochieng',
  'coordinator',
  NULL,
  '+256711000001',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Computer Science',
  'coordinator',
  FALSE
),
(
  '22222222-2222-4222-8222-222222222222',
  'student1@nest.edu',
  'Alice Mwangi',
  'student',
  '26/2/222/D/2222',
  '+256700123456',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Computer Science',
  'normal',
  FALSE
),
(
  '33333333-3333-4333-8333-333333333333',
  'student2@nest.edu',
  'Brian Kamau',
  'student',
  '26/2/333/D/3333',
  '+256770987654',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Computer Science',
  'normal',
  FALSE
),
(
  '44444444-4444-4444-8444-444444444444',
  'student3@nest.edu',
  'Carol Achieng',
  'student',
  '26/2/444/D/4444',
  '+256750111333',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Computer Science',
  'normal',
  FALSE
),
(
  '55555555-5555-4555-8555-555555555555',
  'selected_coord@nest.edu',
  'David Njoroge',
  'student',
  '26/2/555/D/5555',
  '+256701222444',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Computer Science',
  'selected_coordinator',
  TRUE
),
(
  '66666666-6666-4666-8666-666666666666',
  'student4@nest.edu',
  'Esther Nakato',
  'student',
  '26/2/666/D/6666',
  '+256782333444',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Information Technology',
  'normal',
  FALSE
),
(
  '77777777-7777-4777-8777-777777777777',
  'student5@nest.edu',
  'Francis Okello',
  'student',
  '26/2/777/D/7777',
  '+256704555666',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Computer Science',
  'normal',
  FALSE
),
(
  '88888888-8888-4888-8888-888888888888',
  'student6@nest.edu',
  'Grace Wanjiku',
  'student',
  '26/2/888/D/8888',
  '+256779888999',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Software Engineering',
  'selected_coordinator',
  TRUE
),
(
  '99999999-9999-4999-8999-999999999999',
  'coordinator2@nest.edu',
  'Prof. Sarah Tumusiime',
  'coordinator',
  NULL,
  '+256712333222',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Software Engineering',
  'coordinator',
  FALSE
),
(
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'student7@nest.edu',
  'Henry Mukasa',
  'student',
  '26/2/999/D/9999',
  '+256705111222',
  'Ndejje University',
  'Faculty of Computing',
  'BSc Computer Science',
  'normal',
  FALSE
)
ON CONFLICT (id) DO UPDATE SET
  email                       = EXCLUDED.email,
  full_name                   = EXCLUDED.full_name,
  role                        = EXCLUDED.role,
  student_registration_number = EXCLUDED.student_registration_number,
  whatsapp_phone              = EXCLUDED.whatsapp_phone,
  university                  = EXCLUDED.university,
  faculty                     = EXCLUDED.faculty,
  course                      = EXCLUDED.course,
  status                      = EXCLUDED.status,
  selected_coordinator        = EXCLUDED.selected_coordinator,
  updated_at                  = NOW();

-- Step 4: Re-enable the trigger if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    BEGIN
      EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER TABLE public.users ENABLE TRIGGER on_auth_user_created;';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- Step 5: Grant permissions
GRANT SELECT ON public.users TO anon, authenticated;
GRANT SELECT ON public.course_units TO anon, authenticated;
GRANT SELECT ON public.courseworks TO anon, authenticated;
GRANT SELECT ON public.groups TO anon, authenticated;
GRANT SELECT ON public.group_members TO anon, authenticated;

-- Verification
SELECT 'auth.users count' as check_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'public.users count', COUNT(*) FROM public.users
UNION ALL
SELECT 'auth.identities count', COUNT(*) FROM auth.identities;
