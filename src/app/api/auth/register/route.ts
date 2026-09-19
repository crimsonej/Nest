import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Server-side normalization utilities
 */
function normalizeEmail(email: string): string {
  return email ? email.trim().toLowerCase() : ''
}

function normalizeRegNumber(reg: string): string {
  if (!reg) return ''
  return reg.replace(/[\s\-\/]/g, '').toUpperCase().trim()
}

function normalizePhone(phone: string): string {
  if (!phone) return ''
  let digits = phone.replace(/[^\d+]/g, '').trim()
  if (digits.startsWith('0')) {
    digits = '+256' + digits.slice(1)
  } else if (!digits.startsWith('+') && digits.length >= 9) {
    digits = '+' + digits
  }
  return digits
}

function normalizeNameWords(name: string): string {
  if (!name) return ''
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      fullName,
      email,
      gender,
      university,
      studentRegistrationNumber,
      whatsappPhone,
      faculty,
      course,
      facultyId,
      courseId,
    } = body

    const normalizedEmailVal = normalizeEmail(email || '')
    const normalizedRegVal = normalizeRegNumber(studentRegistrationNumber || '')
    const normalizedPhoneVal = normalizePhone(whatsappPhone || '')
    const normalizedNameVal = normalizeNameWords(fullName || '')

    if (!normalizedEmailVal || !normalizedRegVal || !normalizedPhoneVal || !fullName) {
      return NextResponse.json(
        { error: 'Missing required registration details.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. Query existing accounts for duplicate checking
    const { data: dbUsers, error: dbErr } = await admin
      .from('users')
      .select('id, email, full_name, student_registration_number, whatsapp_phone')

    let emailExists = false
    let regExists = false
    let phoneExists = false
    let nameMatchFound = false

    if (!dbErr && dbUsers && dbUsers.length > 0) {
      for (const u of dbUsers) {
        const dbEmail = normalizeEmail(u.email || '')
        const dbReg = normalizeRegNumber(u.student_registration_number || '')
        const dbPhone = normalizePhone(u.whatsapp_phone || '')
        const dbName = normalizeNameWords(u.full_name || '')

        if (dbEmail && dbEmail === normalizedEmailVal) {
          emailExists = true
        }
        if (dbReg && dbReg === normalizedRegVal) {
          regExists = true
        }
        if (dbPhone && dbPhone === normalizedPhoneVal) {
          phoneExists = true
        }
        if (dbName && dbName === normalizedNameVal) {
          nameMatchFound = true
        }
      }
    }

    // 2. If registration number, email, or phone is already used:
    // Do not create another profile. Show generic message and attempt resending confirmation.
    if (emailExists || regExists || phoneExists) {
      // Attempt to resend confirmation email via admin auth in case they are unconfirmed
      try {
        await admin.auth.resend({
          type: 'signup',
          email: normalizedEmailVal,
        })
      } catch (resendErr) {
        console.warn('Could not resend signup email during duplicate check:', resendErr)
      }

      return NextResponse.json(
        {
          duplicate: true,
          error:
            'An account may already exist for these details. Try signing in or resetting your password.',
        },
        { status: 409 }
      )
    }

    // 3. If a name match is detected but unique identifiers are different:
    // Allow registration, but flag for administrator review.
    const flaggedForReview = nameMatchFound
    const flagReason = nameMatchFound
      ? 'Reordered or matching name detected with distinct email, registration number, and phone.'
      : null

    return NextResponse.json({
      success: true,
      normalized: {
        fullName: fullName.trim(),
        email: normalizedEmailVal,
        studentRegistrationNumber: studentRegistrationNumber.trim(),
        whatsappPhone: normalizedPhoneVal,
        gender: (gender || 'other').toLowerCase(),
        university: university?.trim(),
        faculty: faculty?.trim(),
        course: course?.trim(),
        facultyId,
        courseId,
      },
      flaggedForReview,
      flagReason,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration check failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
