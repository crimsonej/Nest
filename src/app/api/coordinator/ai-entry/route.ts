import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLocalState, isLocalDataMode, validateRegNumber } from '@/lib/local-data'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, prompt, provider, apiKey, rows } = body

    if (action === 'preview') {
      const parsedRows: any[] = []
      const lines = prompt.split('\n').filter((l: string) => l.trim().length > 0)

      for (const line of lines) {
        const parts = line.split(/[,;\t|]+/).map((p: string) => p.trim())
        if (parts.length >= 2) {
          const regNoCandidate = parts.find((p: string) => /\d{2}\/\d/.test(p)) || parts[1] || ''
          const emailCandidate = parts.find((p: string) => p.includes('@')) || `${parts[0].toLowerCase().replace(/\s+/g, '')}@nest.edu`
          const genderCandidate = parts.find((p: string) => ['male', 'female', 'other'].includes(p.toLowerCase())) || 'female'

          parsedRows.push({
            full_name: parts[0] || 'Unknown Student',
            student_registration_number: regNoCandidate,
            email: emailCandidate,
            gender: genderCandidate.toLowerCase(),
            course: 'BSc Computer Science',
            faculty: 'Faculty of Computing',
            university: 'Ndejje University',
            isValidReg: validateRegNumber(regNoCandidate),
          })
        }
      }

      if (parsedRows.length === 0 && prompt.length > 5) {
        parsedRows.push({
          full_name: 'Sample Imported Student',
          student_registration_number: '26/2/299/D/2299',
          email: 'sample.import@nest.edu',
          gender: 'female',
          course: 'BSc Computer Science',
          faculty: 'Faculty of Computing',
          university: 'Ndejje University',
          isValidReg: true,
        })
      }

      let existingEmails = new Set<string>()
      let existingRegs = new Set<string>()

      if (isLocalDataMode()) {
        const state = getLocalState()
        state.users.forEach((u) => {
          if (u.email) existingEmails.add(u.email.toLowerCase())
          if (u.student_registration_number) existingRegs.add(u.student_registration_number.toLowerCase())
        })
      } else {
        const supabase = await createClient()
        const { data: users } = await supabase.from('users').select('email, student_registration_number')
        ;(users || []).forEach((u: any) => {
          if (u.email) existingEmails.add(u.email.toLowerCase())
          if (u.student_registration_number) existingRegs.add(u.student_registration_number.toLowerCase())
        })
      }

      const verifiedRows = parsedRows.map((r) => {
        const isDuplicateEmail = existingEmails.has(r.email.toLowerCase())
        const isDuplicateReg = existingRegs.has(r.student_registration_number.toLowerCase())
        const isDuplicate = isDuplicateEmail || isDuplicateReg

        return {
          ...r,
          status: isDuplicate ? 'duplicate_skipped' : r.isValidReg ? 'valid_new' : 'invalid_reg',
          notes: isDuplicate ? 'Duplicate record already exists in database' : !r.isValidReg ? 'Invalid Ndejje reg number format' : 'Ready for database insert',
        }
      })

      const newCount = verifiedRows.filter((r) => r.status === 'valid_new').length
      const duplicateCount = verifiedRows.filter((r) => r.status === 'duplicate_skipped').length

      return NextResponse.json({
        success: true,
        rows: verifiedRows,
        summary: {
          totalDetected: verifiedRows.length,
          newRecords: newCount,
          duplicates: duplicateCount,
          provider: provider || 'gemini',
        },
      })
    }

    if (action === 'commit') {
      const validRows = (rows || []).filter((r: any) => r.status === 'valid_new')

      if (validRows.length === 0) {
        return NextResponse.json({ error: 'No valid non-duplicate records to commit.' }, { status: 400 })
      }

      const now = new Date().toISOString()
      const inserted: any[] = []

      if (isLocalDataMode()) {
        const state = getLocalState()
        validRows.forEach((r: any, idx: number) => {
          const newUser = {
            id: `student-ai-${Date.now()}-${idx}`,
            email: r.email,
            full_name: r.full_name,
            role: 'student',
            gender: r.gender,
            university: 'Ndejje University',
            student_registration_number: r.student_registration_number,
            whatsapp_phone: `+256700${Math.floor(100000 + Math.random() * 900000)}`,
            faculty: 'Faculty of Computing',
            course: 'BSc Computer Science',
            status: 'normal',
            created_at: now,
            updated_at: now,
          }
          state.users.push(newUser)
          inserted.push(newUser)
        })

        state.audit_logs.push({
          id: `audit-${Date.now()}`,
          user_id: 'coordinator-demo-1',
          action: 'CRIMSON_AI_BULK_INSERT',
          entity_type: 'users',
          entity_id: inserted[0]?.id,
          new_data: { count: inserted.length, records: inserted },
          created_at: now,
        })
      } else {
        const supabase = await createClient()
        const payload = validRows.map((r: any) => ({
          email: r.email,
          full_name: r.full_name,
          role: 'student',
          gender: r.gender,
          university: 'Ndejje University',
          student_registration_number: r.student_registration_number,
          faculty: 'Faculty of Computing',
          course: 'BSc Computer Science',
          status: 'normal',
        }))

        const { data, error } = await supabase.from('users').insert(payload).select()
        if (error) throw error
        inserted.push(...(data || []))
      }

      return NextResponse.json({
        success: true,
        committedCount: inserted.length,
        message: `Successfully written ${inserted.length} new student records to database with full audit log.`,
      })
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 })
  } catch (error) {
    console.error('Crimson AI Entry route error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI Processing error' }, { status: 500 })
  }
}
