import type { User } from '@/types'
import { reportStudentQuery } from '@/lib/student-query-diagnostics'

type SupabaseClient = ReturnType<typeof import('@/lib/supabase/client').createClient>

export async function getStudentCourseUnitIds(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'faculty_id' | 'faculty'>
) {
  let facultyId = user.faculty_id || null

  if (!facultyId && user.faculty) {
    const { data: faculty, error } = await supabase
      .from('faculties')
      .select('id')
      .or(`code.eq.${user.faculty},name.ilike.${user.faculty}`)
      .maybeSingle()
    reportStudentQuery('faculty lookup', { match: 'profile faculty code/name' }, faculty, error)
    if (error) throw error
    facultyId = faculty?.id || null
  }

  if (!facultyId) {
    console.warn('[student-data][temporary] Faculty-scoped course-unit lookup skipped', {
      facultyIdPresent: Boolean(user.faculty_id),
      facultyNamePresent: Boolean(user.faculty),
    })
    return []
  }

  const [facultyCoursesRes, sharedUnitsRes] = await Promise.all([
    supabase.from('courses').select('id').eq('faculty_id', facultyId).eq('is_active', true),
    supabase.from('course_unit_faculties').select('course_unit_id').eq('faculty_id', facultyId),
  ])
  reportStudentQuery('faculty courses', { faculty_id: 'profile faculty', is_active: true }, facultyCoursesRes.data, facultyCoursesRes.error)
  reportStudentQuery('shared course units', { faculty_id: 'profile faculty' }, sharedUnitsRes.data, sharedUnitsRes.error)
  if (facultyCoursesRes.error) throw facultyCoursesRes.error
  if (sharedUnitsRes.error) throw sharedUnitsRes.error

  const courseIds = (facultyCoursesRes.data || []).map((course) => course.id)
  let ownedUnits: Array<{ id: string }> = []
  if (courseIds.length) {
    const ownedUnitsRes = await supabase.from('course_units').select('id').in('course_id', courseIds).eq('is_active', true)
    reportStudentQuery('owned course units', { course_count: courseIds.length, is_active: true }, ownedUnitsRes.data, ownedUnitsRes.error)
    if (ownedUnitsRes.error) throw ownedUnitsRes.error
    ownedUnits = ownedUnitsRes.data || []
  }

  return Array.from(new Set([
    ...ownedUnits.map((unit) => unit.id),
    ...(sharedUnitsRes.data || []).map((unit) => unit.course_unit_id),
  ]))
}