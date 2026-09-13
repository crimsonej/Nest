import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLocalState, isLocalDataMode } from '@/lib/local-data'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Fallback demo profiles when Supabase DB has no users yet
// These IDs are intentionally dummy — they work with Preview Mode (cookie-based auth)
const DEMO_PROFILES = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'coordinator@nest.edu',
    full_name: 'Dr. James Ochieng',
    role: 'coordinator' as const,
    status: 'coordinator',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    student_registration_number: null,
    whatsapp_phone: '+256711000001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'student1@nest.edu',
    full_name: 'Alice Mwangi',
    role: 'student' as const,
    status: 'normal',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    student_registration_number: '26/2/222/D/2222',
    whatsapp_phone: '+256700123456',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'student2@nest.edu',
    full_name: 'Brian Kamau',
    role: 'student' as const,
    status: 'normal',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    student_registration_number: '26/2/333/D/3333',
    whatsapp_phone: '+256770987654',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'student3@nest.edu',
    full_name: 'Carol Achieng',
    role: 'student' as const,
    status: 'normal',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    student_registration_number: '26/2/444/D/4444',
    whatsapp_phone: '+256750111333',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'selected_coord@nest.edu',
    full_name: 'David Njoroge',
    role: 'student' as const,
    status: 'selected_coordinator',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    student_registration_number: '26/2/555/D/5555',
    whatsapp_phone: '+256701222444',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'student4@nest.edu',
    full_name: 'Esther Nakato',
    role: 'student' as const,
    status: 'normal',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Information Technology',
    student_registration_number: '26/2/666/D/6666',
    whatsapp_phone: '+256782333444',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    email: 'student5@nest.edu',
    full_name: 'Francis Okello',
    role: 'student' as const,
    status: 'normal',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    student_registration_number: '26/2/777/D/7777',
    whatsapp_phone: '+256704555666',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    email: 'student6@nest.edu',
    full_name: 'Grace Wanjiku',
    role: 'student' as const,
    status: 'selected_coordinator',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Software Engineering',
    student_registration_number: '26/2/888/D/8888',
    whatsapp_phone: '+256779888999',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'coordinator2@nest.edu',
    full_name: 'Prof. Sarah Tumusiime',
    role: 'coordinator' as const,
    status: 'coordinator',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Software Engineering',
    student_registration_number: null,
    whatsapp_phone: '+256712333222',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    email: 'student7@nest.edu',
    full_name: 'Henry Mukasa',
    role: 'student' as const,
    status: 'normal',
    university: 'Ndejje University',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    student_registration_number: '26/2/999/D/9999',
    whatsapp_phone: '+256705111222',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Preview profiles are available only in development.' }, { status: 404 })
  }

  if (isLocalDataMode()) {
    const { users } = getLocalState()
    return NextResponse.json({
      accounts: users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })),
    })
  }

  try {
    const supabase = await createAdminClient()
    const { data: accounts, error } = await supabase
      .from('users')
      .select('*')
      .order('role')
      .order('full_name')

    if (error) throw error

    // If no users in DB yet, return the hardcoded demo profiles so login still works
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ accounts: DEMO_PROFILES, _source: 'fallback' })
    }

    return NextResponse.json({ accounts: accounts || [] })
  } catch (error) {
    console.error('Preview profile list failed:', error)
    // Fallback to demo profiles so the app is always usable
    return NextResponse.json({ accounts: DEMO_PROFILES, _source: 'fallback' })
  }
}