-- NEST FACULTIES AND COURSES
--
-- For an existing Supabase project that already ran 00_initial_schema.sql,
-- run this file once before inserting the sample faculty/course records.
-- For a brand-new project, the current 00_initial_schema.sql already creates
-- these tables, so start at the INSERT statements below.

CREATE TABLE IF NOT EXISTS public.faculties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.course_units
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS faculty TEXT;

CREATE INDEX IF NOT EXISTS idx_courses_faculty ON public.courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_course_units_course ON public.course_units(course_id);

ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'faculties' AND policyname = 'Authenticated users can view active faculties') THEN
    CREATE POLICY "Authenticated users can view active faculties" ON public.faculties
      FOR SELECT USING (is_active = TRUE AND auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'faculties' AND policyname = 'Coordinators can manage faculties') THEN
    CREATE POLICY "Coordinators can manage faculties" ON public.faculties
      FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'courses' AND policyname = 'Authenticated users can view active courses') THEN
    CREATE POLICY "Authenticated users can view active courses" ON public.courses
      FOR SELECT USING (is_active = TRUE AND auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'courses' AND policyname = 'Coordinators can manage courses') THEN
    CREATE POLICY "Coordinators can manage courses" ON public.courses
      FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')));
  END IF;
END;
$$;

-- Sample faculty and degree/program courses.
INSERT INTO public.faculties (id, code, name, description)
VALUES (
  '77777777-7777-4777-8777-777777777777',
  'SCI',
  'Faculty of Science and Technology',
  'Programs in computing, information systems, and applied technology.'
)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.courses (id, faculty_id, code, name, description)
VALUES
  (
    '88888888-8888-4888-8888-888888888888',
    '77777777-7777-4777-8777-777777777777',
    'BSC-CS',
    'Bachelor of Science in Computer Science',
    'Undergraduate computer science degree program.'
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    '77777777-7777-4777-8777-777777777777',
    'BSC-IS',
    'Bachelor of Science in Information Systems',
    'Undergraduate information systems degree program.'
  )
ON CONFLICT (id) DO UPDATE SET
  faculty_id = EXCLUDED.faculty_id,
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

UPDATE public.course_units cu
SET course_id = c.id,
    updated_at = NOW()
FROM public.courses c
WHERE cu.code IN ('CS101', 'CS201', 'DB301')
  AND c.code = 'BSC-CS';
