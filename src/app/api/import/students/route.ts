import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()
    const { csvData, courseworkId } = body

    if (!csvData || !courseworkId) {
      return NextResponse.json({ error: 'csvData and courseworkId are required' }, { status: 400 })
    }

    const lines = csvData.trim().split('\n')
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header row and one data row' }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const requiredHeaders = ['full_name', 'email', 'student_registration_number']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return NextResponse.json({ error: `Missing required columns: ${missingHeaders.join(', ')}` }, { status: 400 })
    }

    const results = { success: 0, failed: 0, errors: [] as any[] }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })

      try {
        // Validate required fields
        if (!row.full_name || !row.email || !row.student_registration_number) {
          throw new Error('Missing required fields')
        }

        // Check if student exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', row.email)
          .single()

        if (existingUser) {
          // Update existing student
          const { error } = await supabase
            .from('users')
            .update({
              full_name: row.full_name,
              student_registration_number: row.student_registration_number,
              whatsapp_phone: row.whatsapp_phone || null,
              course: row.course || null,
            })
            .eq('id', existingUser.id)

          if (error) throw error
        } else {
          // Create new student (invite flow would be needed for auth)
          // For now, just log that manual invite is needed
          results.errors.push({
            row: i + 1,
            error: 'Student does not exist in auth. Manual invite required.',
            data: row,
          })
          results.failed++
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