import type { User } from '@/types'

type SupabaseClient = ReturnType<typeof import('@/lib/supabase/client').createClient>

export async function getStudentCourseUnitIds(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'faculty_id' | 'faculty'>
) {
  let facultyId = user.faculty_id || null

  if (!facultyId && user.faculty) {
    const { data: faculty } = await supabase
      .from('faculties')
      .select('id')
      .or(`code.eq.${user.faculty},name.ilike.${user.faculty}`)
      .maybeSingle()
    facultyId = faculty?.id || null
  }

  if (!facultyId) return []

  const [{ data: facultyCourses }, { data: sharedUnits }] = await Promise.all([
    supabase.from('courses').select('id').eq('faculty_id', facultyId).eq('is_active', true),
    supabase.from('course_unit_faculties').select('course_unit_id').eq('faculty_id', facultyId),
  ])

  const courseIds = (facultyCourses || []).map((course) => course.id)
  const { data: ownedUnits } = courseIds.length
    ? await supabase.from('course_units').select('id').in('course_id', courseIds).eq('is_active', true)
    : { data: [] as Array<{ id: string }> }

  return Array.from(new Set([
    ...(ownedUnits || []).map((unit) => unit.id),
    ...(sharedUnits || []).map((unit) => unit.course_unit_id),
  ]))
}