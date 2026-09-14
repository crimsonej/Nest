import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { validateRegistrationNumber } from '@/lib/university-config'

export const runtime = 'edge'

type ImportRow = {
  full_name: string
  email: string
  student_registration_number: string
  gender?: 'male' | 'female' | 'other'
  university?: string
  whatsapp_phone?: string
  faculty?: string
  course?: string
}

export async function POST(request: Request) {
  try {
    const authClient = await createClient()
    const { data: { user: authUser } } = await authClient.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { data: coordinator, error: coordinatorError } = await authClient
      .from('users')
      .select('role, university')
      .eq('id', authUser.id)
      .maybeSingle()

    if (coordinatorError || !coordinator || !['coordinator', 'lecturer'].includes(coordinator.role)) {
      return NextResponse.json({ error: 'Coordinator access required' }, { status: 403 })
    }

    const body = await request.json() as { rows?: ImportRow[] }
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) return NextResponse.json({ error: 'No student rows supplied.' }, { status: 400 })

    const admin = await createAdminClient()
    const results = { inserted: [] as any[], skipped: [] as any[], errors: [] as any[] }
    const importedEmails = new Set<string>()
    const importedRegistrations = new Set<string>()

    for (const row of rows) {
      try {
        const email = String(row.email || '').trim().toLowerCase()
        const registrationNumber = String(row.student_registration_number || '').trim().toUpperCase()
        const fullName = String(row.full_name || '').trim()

        if (!fullName || !email || !registrationNumber) throw new Error('Full name, email, and registration number are required.')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email address.')
        if (importedEmails.has(email) || importedRegistrations.has(registrationNumber)) throw new Error('Duplicate row in this import.')

        const validation = validateRegistrationNumber(registrationNumber, coordinator.university || undefined)
        if (!validation.valid) throw new Error(`Invalid registration number; expected example ${validation.example}.`)

        const [{ data: existingEmail }, { data: existingRegistration }] = await Promise.all([
          admin.from('users').select('id').ilike('email', email).maybeSingle(),
          admin.from('users').select('id').eq('student_registration_number', registrationNumber).maybeSingle(),
        ])

        if (existingEmail || existingRegistration) {
          results.skipped.push({ email, student_registration_number: registrationNumber, reason: 'Already exists' })
          continue
        }

        const created = await admin.auth.admin.createUser({
          email,
          password: process.env.NEST_IMPORTED_STUDENT_PASSWORD || process.env.NEST_AUTO_LOGIN_PASSWORD || 'NestStudent123!',
          email_confirm: true,
          user_metadata: { full_name: fullName, role: 'student', status: 'normal' },
        })
        if (created.error || !created.data.user) throw created.error || new Error('Unable to create Auth user.')

        const profile = {
          id: created.data.user.id,
          email,
          full_name: fullName,
          role: 'student',
          gender: row.gender || 'other',
          university: row.university || coordinator.university || 'Ndejje University',
          student_registration_number: registrationNumber,
          whatsapp_phone: row.whatsapp_phone || null,
          faculty: row.faculty || null,
          course: row.course || null,
          status: 'normal',
        }
        const { data: inserted, error: profileError } = await admin.from('users').insert(profile).select().single()
        if (profileError) {
          await admin.auth.admin.deleteUser(created.data.user.id)
          throw profileError
        }

        await admin.from('audit_logs').insert({
          user_id: authUser.id,
          action: 'bulk_student_insert',
          entity_type: 'users',
          entity_id: inserted.id,
          new_data: inserted,
        })

        results.inserted.push(inserted)
        importedEmails.add(email)
        importedRegistrations.add(registrationNumber)
      } catch (error) {
        results.errors.push({
          email: row.email,
          student_registration_number: row.student_registration_number,
          error: error instanceof Error ? error.message : 'Unable to import student.',
        })
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      inserted: results.inserted,
      skipped: results.skipped,
      errors: results.errors,
      committedCount: results.inserted.length,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Student import failed.' }, { status: 500 })
  }
}