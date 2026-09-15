import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLocalState } from '@/lib/local-data'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function normalizeReg(reg: string): string {
  return reg.replace(/\s+/g, '').toUpperCase().trim()
}

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('256')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits
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

    const normRegInput = normalizeReg(rawIdentifier)
    const normPhoneInput = normalizePhone(rawIdentifier)

    // 2. Query Supabase Database via Admin Client
    try {
      const admin = await createAdminClient()

      const { data: dbUsers, error: dbErr } = await admin
        .from('users')
        .select('email, whatsapp_phone, student_registration_number')

      if (!dbErr && dbUsers && dbUsers.length > 0) {
        // Try Registration Number match
        const regMatch = dbUsers.find((u) => {
          if (!u.student_registration_number) return false
          return normalizeReg(u.student_registration_number) === normRegInput
        })

        if (regMatch?.email) {
          return NextResponse.json({ email: regMatch.email })
        }

        // Try Phone Number match
        if (normPhoneInput.length >= 4) {
          const phoneMatch = dbUsers.find((u) => {
            if (!u.whatsapp_phone) return false
            const dbPhoneNorm = normalizePhone(u.whatsapp_phone)
            return dbPhoneNorm.length >= 4 && (dbPhoneNorm === normPhoneInput || dbPhoneNorm.endsWith(normPhoneInput) || normPhoneInput.endsWith(dbPhoneNorm))
          })

          if (phoneMatch?.email) {
            return NextResponse.json({ email: phoneMatch.email })
          }
        }
      }
    } catch (adminErr) {
      console.warn('Supabase admin lookup failed, falling back to seed users:', adminErr)
    }

    // 3. Fallback to Local Data State (Seed Users)
    const localState = getLocalState()
    const seedMatch = localState.users.find((user) => {
      const regMatch = user.student_registration_number && normalizeReg(user.student_registration_number) === normRegInput
      const phoneMatch = user.whatsapp_phone && normPhoneInput.length >= 4 && (normalizePhone(user.whatsapp_phone) === normPhoneInput || normalizePhone(user.whatsapp_phone).endsWith(normPhoneInput))
      return regMatch || phoneMatch
    })

    if (seedMatch?.email) {
      return NextResponse.json({ email: seedMatch.email })
    }

    return NextResponse.json(
      {
        error:
          'No account found matching that Phone Number or Registration Number. Please verify your details or sign in with your email address.',
      },
      { status: 404 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve login identifier.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
