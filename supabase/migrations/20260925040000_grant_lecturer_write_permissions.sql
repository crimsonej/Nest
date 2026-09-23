-- Grant full management permissions (INSERT, UPDATE, DELETE) to Lecturers
-- for data strictly scoped to their assigned course unit.

-- 1. Courseworks Write Policies
DROP POLICY IF EXISTS "Lecturers can create courseworks for their unit" ON public.courseworks;
CREATE POLICY "Lecturers can create courseworks for their unit"
  ON public.courseworks FOR INSERT
  TO authenticated
  WITH CHECK (course_unit_id = public.get_lecturer_course_unit_id());

DROP POLICY IF EXISTS "Lecturers can update courseworks for their unit" ON public.courseworks;
CREATE POLICY "Lecturers can update courseworks for their unit"
  ON public.courseworks FOR UPDATE
  TO authenticated
  USING (course_unit_id = public.get_lecturer_course_unit_id())
  WITH CHECK (course_unit_id = public.get_lecturer_course_unit_id());

DROP POLICY IF EXISTS "Lecturers can delete courseworks for their unit" ON public.courseworks;
CREATE POLICY "Lecturers can delete courseworks for their unit"
  ON public.courseworks FOR DELETE
  TO authenticated
  USING (course_unit_id = public.get_lecturer_course_unit_id());

-- 2. Groups Write Policies
DROP POLICY IF EXISTS "Lecturers can create groups for their unit" ON public.groups;
CREATE POLICY "Lecturers can create groups for their unit"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courseworks cw
      WHERE cw.id = coursework_id
        AND cw.course_unit_id = public.get_lecturer_course_unit_id()
    )
  );

DROP POLICY IF EXISTS "Lecturers can update groups for their unit" ON public.groups;
CREATE POLICY "Lecturers can update groups for their unit"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courseworks cw
      WHERE cw.id = coursework_id
        AND cw.course_unit_id = public.get_lecturer_course_unit_id()
    )
  );

DROP POLICY IF EXISTS "Lecturers can delete groups for their unit" ON public.groups;
CREATE POLICY "Lecturers can delete groups for their unit"
  ON public.groups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courseworks cw
      WHERE cw.id = coursework_id
        AND cw.course_unit_id = public.get_lecturer_course_unit_id()
    )
  );

-- 3. Group Members Write Policies
DROP POLICY IF EXISTS "Lecturers can manage group members for their unit" ON public.group_members;
CREATE POLICY "Lecturers can manage group members for their unit"
  ON public.group_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.courseworks cw ON cw.id = g.coursework_id
      WHERE g.id = group_id
        AND cw.course_unit_id = public.get_lecturer_course_unit_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.courseworks cw ON cw.id = g.coursework_id
      WHERE g.id = group_id
        AND cw.course_unit_id = public.get_lecturer_course_unit_id()
    )
  );

-- 4. Student Enrollments Write Policies
DROP POLICY IF EXISTS "Lecturers can manage student enrollments for their unit" ON public.student_course_units;
CREATE POLICY "Lecturers can manage student enrollments for their unit"
  ON public.student_course_units FOR ALL
  TO authenticated
  USING (course_unit_id = public.get_lecturer_course_unit_id())
  WITH CHECK (course_unit_id = public.get_lecturer_course_unit_id());
