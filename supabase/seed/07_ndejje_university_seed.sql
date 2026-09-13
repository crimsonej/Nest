-- Seed the Ndejje University default setup.
-- Run after 00_initial_schema.sql and 01_universities_and_dynamic_rules.sql.

INSERT INTO public.universities (
  university,
  abbreviation,
  branch,
  location,
  accepted_reg_number_pattern,
  example_reg_number
)
VALUES (
  'Ndejje University',
  'NU',
  'Kampala Campus',
  'Kampala, Uganda',
  '^\\d{2}/\\d{1,2}/\\d{3,4}/[A-Z]/\\d{4}$',
  '26/2/222/D/2222'
)
ON CONFLICT (university) DO UPDATE SET
  abbreviation = EXCLUDED.abbreviation,
  branch = EXCLUDED.branch,
  location = EXCLUDED.location,
  accepted_reg_number_pattern = EXCLUDED.accepted_reg_number_pattern,
  example_reg_number = EXCLUDED.example_reg_number,
  updated_at = NOW();

INSERT INTO public.registration_rules (
  university_id,
  faculty_name,
  program_name,
  intake_year,
  delivery_mode,
  accepted_reg_number_pattern,
  example_reg_number
)
SELECT
  u.id,
  'Faculty of Science and Technology',
  'Computer Science',
  1,
  'day',
  '^\\d{2}/\\d{1,2}/\\d{3,4}/[A-Z]/\\d{4}$',
  '26/2/222/D/2222'
FROM public.universities u
WHERE u.university = 'Ndejje University'
ON CONFLICT (university_id, faculty_name, program_name, intake_year, delivery_mode) DO NOTHING;

UPDATE public.faculties
SET university_id = u.id,
    updated_at = NOW()
FROM public.universities u
WHERE u.university = 'Ndejje University'
  AND public.faculties.university_id IS NULL;

UPDATE public.users
SET university_id = u.id,
    university = u.university,
    updated_at = NOW()
FROM public.universities u
WHERE u.university = 'Ndejje University'
  AND public.users.university_id IS NULL;

-- Example course enrolment records for earlier demo users if they already exist.
INSERT INTO public.student_course_units (user_id, course_unit_id, status)
SELECT u.id, cu.id, 'active'
FROM public.users u
JOIN public.course_units cu ON cu.code = 'CS101'
WHERE u.email LIKE 'student%@nest.edu'
ON CONFLICT (user_id, course_unit_id) DO NOTHING;
