-- Ensure Coordinators, Admins, and Lecturers can manage student course unit enrollments in student_course_units

DROP POLICY IF EXISTS "Coordinators and admins can manage student_course_units" ON public.student_course_units;
CREATE POLICY "Coordinators and admins can manage student_course_units"
  ON public.student_course_units FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_user()
    OR course_unit_id = public.get_lecturer_course_unit_id()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND (role = 'coordinator' OR status = 'coordinator' OR status = 'selected_coordinator' OR role = 'admin' OR status = 'admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin_user()
    OR course_unit_id = public.get_lecturer_course_unit_id()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND (role = 'coordinator' OR status = 'coordinator' OR status = 'selected_coordinator' OR role = 'admin' OR status = 'admin')
    )
  );
