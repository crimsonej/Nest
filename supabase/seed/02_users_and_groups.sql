-- Seed sample students and coordinator users.
-- IMPORTANT: these are examples only. In Supabase, create real auth users first,
-- then replace the UUIDs below with actual auth user IDs.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
      AND table_name IN ('instances', 'users')
  ) THEN
    RAISE NOTICE 'Supabase Auth is not initialized. Skipping users and groups seed.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '22222222-2222-4222-8222-222222222222')
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') THEN
    RAISE NOTICE 'Sample Auth users are not present yet. This seed will stop after the auth check.';
    RETURN;
  END IF;
END;
$$;

-- Example coordinator user
INSERT INTO public.users (id, email, full_name, role, student_registration_number, whatsapp_phone, faculty, course)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  'coordinator@nest.edu',
  'Dr. Ada Primary',
  'coordinator',
  NULL,
  '+254700000001',
  'Faculty of Science and Technology',
  'BSC-CS'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  whatsapp_phone = EXCLUDED.whatsapp_phone,
  faculty = EXCLUDED.faculty,
  course = EXCLUDED.course,
  updated_at = NOW();

-- Example students
INSERT INTO public.users (id, email, full_name, role, student_registration_number, whatsapp_phone, faculty, course)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'student1@nest.edu',
    'Alice Mwangi',
    'student',
    'CS24001',
    '+254712345001',
    'Faculty of Science and Technology',
    'BSC-CS'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'student2@nest.edu',
    'Brian Otieno',
    'student',
    'CS24002',
    '+254712345002',
    'Faculty of Science and Technology',
    'BSC-CS'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'student3@nest.edu',
    'Caroline Njeri',
    'student',
    'CS24003',
    '+254712345003',
    'Faculty of Science and Technology',
    'BSC-CS'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'student4@nest.edu',
    'Daniel Kibet',
    'student',
    'CS24004',
    '+254712345004',
    'Faculty of Science and Technology',
    'BSC-CS'
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  student_registration_number = EXCLUDED.student_registration_number,
  whatsapp_phone = EXCLUDED.whatsapp_phone,
  faculty = EXCLUDED.faculty,
  course = EXCLUDED.course,
  updated_at = NOW();

-- Example group data
INSERT INTO public.groups (id, coursework_id, name, description, leader_id, is_private, status, max_members)
VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '55555555-5555-4555-8555-555555555555',
  'LogicLoop',
  'Java fundamentals group for assignment one.',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  false,
  'active',
  5
)
ON CONFLICT (id) DO UPDATE SET
  coursework_id = EXCLUDED.coursework_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  leader_id = EXCLUDED.leader_id,
  is_private = EXCLUDED.is_private,
  status = EXCLUDED.status,
  max_members = EXCLUDED.max_members,
  updated_at = NOW();

INSERT INTO public.group_members (id, group_id, user_id, role)
VALUES
  ('f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'leader'),
  ('f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'member'),
  ('f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'member')
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role,
  updated_at = NOW();

INSERT INTO public.group_join_requests (id, group_id, user_id, status)
VALUES (
  '12121212-1212-4121-8121-121212121212',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'pending'
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  user_id = EXCLUDED.user_id,
  status = EXCLUDED.status,
  reviewed_at = COALESCE(reviewed_at, NOW());

INSERT INTO public.tasks (id, group_id, user_id, coursework_id, title, description, status, priority, due_date)
VALUES (
  '10101010-1010-4101-8101-101010101010',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '55555555-5555-4555-8555-555555555555',
  'Plan program structure',
  'Create class design and discuss input/output flow.',
  'in_progress',
  'high',
  NOW() + INTERVAL '2 days'
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  user_id = EXCLUDED.user_id,
  coursework_id = EXCLUDED.coursework_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  due_date = EXCLUDED.due_date,
  updated_at = NOW();
