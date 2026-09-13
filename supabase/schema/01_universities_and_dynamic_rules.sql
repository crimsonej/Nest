-- NEST university and validation schema extension
-- Run after 00_initial_schema.sql.

CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university TEXT NOT NULL UNIQUE,
  abbreviation TEXT NOT NULL,
  branch TEXT,
  location TEXT,
  accepted_reg_number_pattern TEXT NOT NULL,
  example_reg_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.registration_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  faculty_name TEXT,
  program_name TEXT,
  intake_year INTEGER,
  delivery_mode TEXT,
  accepted_reg_number_pattern TEXT NOT NULL,
  example_reg_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (university_id, faculty_name, program_name, intake_year, delivery_mode)
);

CREATE TABLE IF NOT EXISTS public.student_course_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_unit_id)
);

CREATE TABLE IF NOT EXISTS public.selected_coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_unit_id)
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'coordinator', 'selected_coordinator')),
  ADD COLUMN IF NOT EXISTS selected_coordinator BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_visible_to_group_only BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS oracle_ref TEXT,
  ADD COLUMN IF NOT EXISTS intake_year INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT,
  ADD COLUMN IF NOT EXISTS university TEXT,
  ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.course_units
  ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT,
  ADD COLUMN IF NOT EXISTS course_level TEXT,
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT,
  ADD COLUMN IF NOT EXISTS intake_year INTEGER;

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS course_unit_id UUID REFERENCES public.course_units(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT,
  ADD COLUMN IF NOT EXISTS formation_window_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS gender_balance TEXT DEFAULT 'auto';

ALTER TABLE public.faculties
  ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_university_id ON public.users(university_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_university_faculty_id ON public.faculties(university_id);
CREATE INDEX IF NOT EXISTS idx_course_units_faculty ON public.course_units(faculty_id);
CREATE INDEX IF NOT EXISTS idx_student_course_units_user ON public.student_course_units(user_id);
CREATE INDEX IF NOT EXISTS idx_student_course_units_course_unit ON public.student_course_units(course_unit_id);
CREATE INDEX IF NOT EXISTS idx_registration_rules_university ON public.registration_rules(university_id);
CREATE INDEX IF NOT EXISTS idx_selected_coordinators_user ON public.selected_coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_coordinators_course_unit ON public.selected_coordinators(course_unit_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_universities_updated_at'
  ) THEN
    CREATE TRIGGER set_universities_updated_at
      BEFORE UPDATE ON public.universities
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_registration_rules_updated_at'
  ) THEN
    CREATE TRIGGER set_registration_rules_updated_at
      BEFORE UPDATE ON public.registration_rules
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_student_course_units_updated_at'
  ) THEN
    CREATE TRIGGER set_student_course_units_updated_at
      BEFORE UPDATE ON public.student_course_units
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_course_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selected_coordinators ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'universities'
      AND policyname = 'Authenticated users can view active universities'
  ) THEN
    CREATE POLICY "Authenticated users can view active universities" ON public.universities
      FOR SELECT USING (is_active = TRUE AND auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'universities'
      AND policyname = 'Coordinators can manage universities'
  ) THEN
    CREATE POLICY "Coordinators can manage universities" ON public.universities
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registration_rules'
      AND policyname = 'Authenticated users can view registration rules'
  ) THEN
    CREATE POLICY "Authenticated users can view registration rules" ON public.registration_rules
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registration_rules'
      AND policyname = 'Coordinators can manage registration rules'
  ) THEN
    CREATE POLICY "Coordinators can manage registration rules" ON public.registration_rules
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_course_units'
      AND policyname = 'Students can manage own course-unit enrollments'
  ) THEN
    CREATE POLICY "Students can manage own course-unit enrollments" ON public.student_course_units
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_course_units'
      AND policyname = 'Coordinators can view all enrollments'
  ) THEN
    CREATE POLICY "Coordinators can view all enrollments" ON public.student_course_units
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'selected_coordinators'
      AND policyname = 'Users can view own selected coordinator assignments'
  ) THEN
    CREATE POLICY "Users can view own selected coordinator assignments" ON public.selected_coordinators
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'selected_coordinators'
      AND policyname = 'Coordinators can manage selected coordinator assignments'
  ) THEN
    CREATE POLICY "Coordinators can manage selected coordinator assignments" ON public.selected_coordinators
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.course_units cu
          WHERE cu.id = selected_coordinators.course_unit_id
            AND cu.coordinator_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.course_units cu
          WHERE cu.id = selected_coordinators.course_unit_id
            AND cu.coordinator_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Seed the default university used in the project requirements.
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

UPDATE public.users
SET university_id = u.id,
    university = u.university,
    status = COALESCE(NULLIF(status, ''), 'normal'),
    updated_at = NOW()
FROM public.universities u
WHERE u.university = 'Ndejje University'
  AND public.users.university_id IS NULL;

UPDATE public.groups
SET course_unit_id = cu.id
FROM public.courseworks cw
JOIN public.course_units cu ON cu.id = cw.course_unit_id
WHERE groups.coursework_id = cw.id
  AND groups.course_unit_id IS NULL;

CREATE OR REPLACE FUNCTION public.validate_group_membership()
RETURNS TRIGGER AS $$
DECLARE
  target_course_unit UUID;
  target_status group_status;
  target_max_members INTEGER;
  target_lock_at TIMESTAMPTZ;
  current_members INTEGER;
BEGIN
  SELECT cw.course_unit_id, g.status, g.max_members, cw.lock_at
  INTO target_course_unit, target_status, target_max_members, target_lock_at
  FROM public.groups g
  JOIN public.courseworks cw ON cw.id = g.coursework_id
  WHERE g.id = NEW.group_id;

  IF target_course_unit IS NULL THEN
    RAISE EXCEPTION 'Group is not attached to a valid course unit';
  END IF;

  IF target_status NOT IN ('forming', 'active') OR (target_lock_at IS NOT NULL AND target_lock_at <= NOW()) THEN
    RAISE EXCEPTION 'Group formation is closed';
  END IF;

  SELECT COUNT(*) INTO current_members
  FROM public.group_members
  WHERE group_id = NEW.group_id;
  IF current_members >= target_max_members THEN
    RAISE EXCEPTION 'Group has reached capacity';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.groups existing_group ON existing_group.id = gm.group_id
    JOIN public.courseworks existing_coursework ON existing_coursework.id = existing_group.coursework_id
    WHERE gm.user_id = NEW.user_id
      AND existing_coursework.course_unit_id = target_course_unit
      AND gm.group_id <> NEW.group_id
      AND existing_group.status IN ('forming', 'active', 'locked')
  ) THEN
    RAISE EXCEPTION 'A student cannot join two groups for the same course unit';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_group_membership_before_insert ON public.group_members;
CREATE TRIGGER validate_group_membership_before_insert
  BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_group_membership();

-- Example helper view for student group enrollment and registration validation.
CREATE OR REPLACE VIEW public.v_student_enrollments AS
SELECT
  u.id AS user_id,
  u.full_name,
  u.email,
  u.student_registration_number,
  u.gender,
  u.role,
  u.status,
  u.university,
  cu.id AS course_unit_id,
  cu.name AS course_unit_name,
  cu.code AS course_unit_code,
  scu.status AS enrollment_status,
  scu.enrolled_at
FROM public.users u
LEFT JOIN public.student_course_units scu ON scu.user_id = u.id
LEFT JOIN public.course_units cu ON cu.id = scu.course_unit_id;
