import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLocalState } from '@/lib/local-data'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function cleanPhoneNumber(phone: string): string {
  // Remove non-digit characters except leading plus
  return phone.replace(/[^\d+]/g, '').trim()
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { identifier?: string }
    const rawIdentifier = body.identifier?.trim() || ''

    if (!rawIdentifier) {
      return NextResponse.json(
        { error: 'Please enter an Email, Phone number, or Registration number.' },
        { status: 400 }
      )
    }

    // 1. Direct email check
    if (rawIdentifier.includes('@')) {
      return NextResponse.json({ email: rawIdentifier.toLowerCase() })
    }

    const cleanInput = rawIdentifier.toUpperCase()
    const cleanPhone = cleanPhoneNumber(rawIdentifier)

    // 2. Query Supabase Database via Admin Client
    try {
      const admin = await createAdminClient()

      // Query users table by student_registration_number, whatsapp_phone, or email
      const { data: dbUsers, error: dbError } = await admin
        .from('users')
        .select('email, whatsapp_phone, student_registration_number')
        .or(
          `student_registration_number.ilike.${cleanInput},whatsapp_phone.ilike.%${cleanPhone}%,email.ilike.${cleanInput}`
        )

      if (!dbError && dbUsers && dbUsers.length > 0) {
        // Find exact or best match
        const exactRegMatch = dbUsers.find(
          (u) => u.student_registration_number?.toUpperCase() === cleanInput
        )
        if (exactRegMatch?.email) {
          return NextResponse.json({ email: exactRegMatch.email })
        }

        const phoneMatch = dbUsers.find((u) => {
          if (!u.whatsapp_phone) return false
          const p = cleanPhoneNumber(u.whatsapp_phone)
          return p.includes(cleanPhone) || cleanPhone.includes(p)
        })
        if (phoneMatch?.email) {
          return NextResponse.json({ email: phoneMatch.email })
        }

        if (dbUsers[0].email) {
          return NextResponse.json({ email: dbUsers[0].email })
        }
      }
    } catch (adminErr) {
      console.warn('Supabase admin lookup failed, falling back to seed users:', adminErr)
    }

    // 3. Fallback to Local Data State (Seed Users)
    const localState = getLocalState()
    const seedMatch = localState.users.find((user) => {
      const regMatch = user.student_registration_number?.toUpperCase() === cleanInput
      const phoneMatch = user.whatsapp_phone && cleanPhoneNumber(user.whatsapp_phone).includes(cleanPhone)
      return regMatch || phoneMatch
    })

    if (seedMatch?.email) {
      return NextResponse.json({ email: seedMatch.email })
    }

    return NextResponse.json(
      {
        error:
          'No account found matching that Phone Number or Registration Number. Please verify your details.',
      },
      { status: 404 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve login identifier.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
