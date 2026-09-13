import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/utils'
import { validateRegistrationNumber } from '@/lib/university-config'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { data: profile, error: profileError } = await authClient
      .from('users')
      .select('role, university')
      .eq('id', user.id)
      .single()
    if (profileError || !profile || !['coordinator', 'lecturer'].includes(profile.role)) {
      return NextResponse.json({ error: 'Coordinator access required' }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const body = await request.json()
    const { csvData, courseworkId } = body

    if (!csvData || !courseworkId) {
      return NextResponse.json({ error: 'csvData and courseworkId are required' }, { status: 400 })
    }

    const rows = parseCSV(csvData)
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header row and one data row' }, { status: 400 })
    }

    const headers = rows[0].map((h: string) => h.trim().toLowerCase())
    const requiredHeaders = ['full_name', 'email', 'student_registration_number']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return NextResponse.json({ error: `Missing required columns: ${missingHeaders.join(', ')}` }, { status: 400 })
    }

    const results = { success: 0, failed: 0, skipped: 0, errors: [] as any[] }
    const seenEmails = new Set<string>()
    const seenRegistrationNumbers = new Set<string>()

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i]
      const row: Record<string, string> = {}
      headers.forEach((h: string, idx: number) => { row[h] = values[idx] || '' })

      try {
        // Validate required fields
        if (!row.full_name || !row.email || !row.student_registration_number) {
          throw new Error('Missing required fields')
        }

        const email = row.email.trim().toLowerCase()
        const registrationNumber = row.student_registration_number.trim().toUpperCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email address')
        if (seenEmails.has(email)) throw new Error('Duplicate email in this file')
        if (seenRegistrationNumbers.has(registrationNumber)) throw new Error('Duplicate registration number in this file')
        seenEmails.add(email)
        seenRegistrationNumbers.add(registrationNumber)
        const registrationValidation = validateRegistrationNumber(registrationNumber, profile.university || undefined)
        if (!registrationValidation.valid) throw new Error(`Invalid registration number; expected example ${registrationValidation.example}`)

        // Check if student exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        if (existingUser) {
          // Update existing student
          const { error } = await supabase
            .from('users')
            .update({
              full_name: row.full_name,
              student_registration_number: registrationNumber,
              whatsapp_phone: row.whatsapp_phone || null,
              course: row.course || null,
            })
            .eq('id', existingUser.id)

          if (error) throw error
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'bulk_student_update',
            entity_type: 'users',
            entity_id: existingUser.id,
            new_data: { email, student_registration_number: registrationNumber },
          })
        } else {
          // Create new student (invite flow would be needed for auth)
          // For now, just log that manual invite is needed
          results.errors.push({
            row: i + 1,
            error: 'Student does not exist in auth. Manual invite required.',
            data: row,
          })
          results.skipped++
          continue
        }

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}