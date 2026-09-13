-- NEST academic data normalization
-- Run after 00_demo_auth_users.sql, 05_faculties_and_courses.sql,
-- and 02_users_and_groups.sql.
-- This file is safe to rerun.

-- Add foreign-key-backed selectors for repeated academic values. The legacy
-- text columns remain for compatibility with the current website and exports.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_faculty ON public.users(faculty_id);
CREATE INDEX IF NOT EXISTS idx_users_course_id ON public.users(course_id);

-- Keep abbreviated program codes separate from their full display names.
INSERT INTO public.faculties (id, code, name, description)
VALUES
  ('77777777-7777-4777-8777-777777777777', 'SCI', 'Faculty of Science and Technology', 'Computing, information systems, and applied technology.'),
  ('78787878-7878-4787-8787-787878787878', 'BUS', 'Faculty of Business and Economics', 'Business, finance, accounting, and commerce programs.'),
  ('79797979-7979-4797-8797-797979797979', 'ENG', 'Faculty of Engineering and Built Environment', 'Engineering, construction, and the built environment.'),
  ('7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a', 'ART', 'Faculty of Arts and Social Sciences', 'Communication, education, social sciences, and humanities.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.courses (id, faculty_id, code, name, description)
VALUES
  ('abababab-abab-4aba-8aba-abababababab', '77777777-7777-4777-8777-777777777777', 'DIT', 'Diploma in Information Technology', 'Diploma program in information technology and applied computing.'),
  ('acacacac-acac-4aca-8aca-acacacacacac', '77777777-7777-4777-8777-777777777777', 'DCS', 'Diploma in Computer Science', 'Diploma program in computer science and software development.'),
  ('adadadad-adad-4ada-8ada-adadadadadad', '77777777-7777-4777-8777-777777777777', 'BSC-SE', 'Bachelor of Science in Software Engineering', 'Undergraduate software engineering degree program.'),
  ('aeaeaeae-aeae-4aea-8aea-aeaeaeaeaeae', '77777777-7777-4777-8777-777777777777', 'BSC-DS', 'Bachelor of Science in Data Science', 'Undergraduate data science and analytics degree program.'),
  ('afafafaf-afaf-4afa-8afa-afafafafafaf', '78787878-7878-4787-8787-787878787878', 'BBA', 'Bachelor of Business Administration', 'Undergraduate business administration degree program.'),
  ('b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0', '78787878-7878-4787-8787-787878787878', 'BSC-ACC', 'Bachelor of Science in Accounting', 'Undergraduate accounting degree program.'),
  ('b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1', '78787878-7878-4787-8787-787878787878', 'BSC-FIN', 'Bachelor of Science in Finance', 'Undergraduate finance degree program.'),
  ('b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2', '78787878-7878-4787-8787-787878787878', 'DCO', 'Diploma in Cooperative Management', 'Diploma program in cooperative management and enterprise.'),
  ('b3b3b3b3-b3b3-4b3b-8b3b-b3b3b3b3b3b3', '79797979-7979-4797-8797-797979797979', 'BENG-CIV', 'Bachelor of Engineering in Civil Engineering', 'Undergraduate civil engineering degree program.'),
  ('b4b4b4b4-b4b4-4b4b-8b4b-b4b4b4b4b4b4', '79797979-7979-4797-8797-797979797979', 'BENG-ELEC', 'Bachelor of Engineering in Electrical Engineering', 'Undergraduate electrical engineering degree program.'),
  ('b5b5b5b5-b5b5-4b5b-8b5b-b5b5b5b5b5b5', '79797979-7979-4797-8797-797979797979', 'DQS', 'Diploma in Quantity Surveying', 'Diploma program in quantity surveying and construction economics.'),
  ('b6b6b6b6-b6b6-4b6b-8b6b-b6b6b6b6b6b6', '79797979-7979-4797-8797-797979797979', 'DCT', 'Diploma in Civil Engineering Technology', 'Diploma program in civil engineering technology.'),
  ('b7b7b7b7-b7b7-4b7b-8b7b-b7b7b7b7b7b7', '7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a', 'BED', 'Bachelor of Education', 'Undergraduate teacher education degree program.'),
  ('b8b8b8b8-b8b8-4b8b-8b8b-b8b8b8b8b8b8', '7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a', 'BCOM', 'Bachelor of Communication and Media', 'Undergraduate communication and media degree program.'),
  ('b9b9b9b9-b9b9-4b9b-8b9b-b9b9b9b9b9b9', '7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a', 'BPSY', 'Bachelor of Psychology', 'Undergraduate psychology degree program.'),
  ('babababa-baba-4bab-8bab-babababababa', '7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a', 'DMC', 'Diploma in Mass Communication', 'Diploma program in journalism and mass communication.')
ON CONFLICT (code) DO UPDATE SET
  faculty_id = EXCLUDED.faculty_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

UPDATE public.courses
SET name = 'Bachelor of Science in Computer Science',
    updated_at = NOW()
WHERE code = 'BSC-CS';

UPDATE public.courses
SET name = 'Bachelor of Science in Information Systems',
    updated_at = NOW()
WHERE code = 'BSC-IS';

-- Give generated demo students a realistic mixed cohort. Existing users with
-- a deliberate course selection are left unchanged.
WITH demo_assignments(position, course_code) AS (
  VALUES
    (1, 'BSC-CS'), (2, 'BSC-IS'), (3, 'DIT'), (4, 'DCS'),
    (5, 'BSC-SE'), (6, 'BSC-DS'), (7, 'BBA'), (8, 'BSC-ACC'),
    (9, 'BSC-FIN'), (10, 'DCO'), (11, 'BENG-CIV'), (12, 'BENG-ELEC'),
    (13, 'DQS'), (14, 'DCT'), (15, 'BED'), (16, 'BCOM'),
    (17, 'BPSY'), (18, 'DMC')
), student_numbers AS (
  SELECT id, (SUBSTRING(email FROM '^student([0-9]+)@'))::INTEGER AS student_number
  FROM public.users
  WHERE email ~ '^student[0-9]+@nest\.edu$'
)
UPDATE public.users AS u
SET course = a.course_code,
    course_id = c.id,
    faculty = f.name,
    faculty_id = f.id,
    updated_at = NOW()
FROM demo_assignments AS a
JOIN public.courses AS c ON c.code = a.course_code
JOIN public.faculties AS f ON f.id = c.faculty_id
JOIN student_numbers AS s ON a.position = ((s.student_number - 1) % 18) + 1
WHERE u.id = s.id;

-- Link existing profiles to catalog rows. Course values are matched by code;
-- the legacy full name is supported for profiles created by older seeds.
UPDATE public.users AS u
SET faculty_id = f.id,
    course_id = c.id,
    updated_at = NOW()
FROM public.courses AS c
JOIN public.faculties AS f ON f.id = c.faculty_id
WHERE u.role = 'student'
  AND (
    UPPER(BTRIM(u.course)) = UPPER(c.code)
    OR (BTRIM(u.course) = 'Computer Science' AND c.code = 'BSC-CS')
  );

-- The website requires registration number, faculty, course code, and a
-- contact number for student lists, interventions, exports, and grouping.
UPDATE public.users
SET full_name = COALESCE(NULLIF(BTRIM(full_name), ''), 'Student ' || student_number),
    student_registration_number = COALESCE(
      NULLIF(BTRIM(student_registration_number), ''),
      'CS24' || LPAD(student_number::TEXT, 3, '0')
    ),
    whatsapp_phone = COALESCE(
      NULLIF(BTRIM(whatsapp_phone), ''),
      '+254700000' || LPAD(student_number::TEXT, 3, '0')
    ),
    faculty = COALESCE(NULLIF(BTRIM(faculty), ''), 'Faculty of Science and Technology'),
    course = CASE
      WHEN NULLIF(BTRIM(course), '') IS NULL OR BTRIM(course) = 'Computer Science'
        THEN 'BSC-CS'
      ELSE BTRIM(course)
    END,
    updated_at = NOW()
FROM (
  SELECT id,
         COALESCE(NULLIF(SUBSTRING(email FROM '^student([0-9]+)@'), ''), '0')::INTEGER AS student_number
  FROM public.users
  WHERE role = 'student'
) AS student_data
WHERE public.users.id = student_data.id;

-- Re-run the relationship link after normalizing legacy course text.
UPDATE public.users AS u
SET faculty_id = c.faculty_id,
    course_id = c.id,
    updated_at = NOW()
FROM public.courses AS c
WHERE u.role = 'student'
  AND UPPER(BTRIM(u.course)) = UPPER(c.code);

-- Verification: these should all return zero for the demo students.
SELECT COUNT(*) AS students_missing_required_profile_data
FROM public.users
WHERE role = 'student'
  AND (
    NULLIF(BTRIM(full_name), '') IS NULL
    OR NULLIF(BTRIM(student_registration_number), '') IS NULL
    OR NULLIF(BTRIM(whatsapp_phone), '') IS NULL
    OR NULLIF(BTRIM(faculty), '') IS NULL
    OR NULLIF(BTRIM(course), '') IS NULL
  );

SELECT COUNT(*) AS students_missing_catalog_relationships
FROM public.users
WHERE role = 'student'
  AND (faculty_id IS NULL OR course_id IS NULL);

SELECT code, name
FROM public.courses
WHERE is_active = TRUE
ORDER BY code;
