import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { validateRegNumber } from '@/lib/local-data'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

type Provider = 'gemini' | 'nvidia' | 'openrouter' | 'claude'
type DiscoveredModel = { id: string; label: string; provider: Provider }

const providerEndpoints: Record<Exclude<Provider, 'gemini' | 'claude'>, string> = {
  nvidia: 'https://integrate.api.nvidia.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
}

function providerHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

async function discoverModels(provider: Provider, apiKey: string) {
  if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Gemini model discovery failed.')
    return (data.models || [])
      .filter((model: any) => (model.supportedGenerationMethods || []).includes('generateContent'))
      .map((model: any) => ({ id: model.name?.replace(/^models\//, ''), label: model.displayName || model.name, provider }))
      .filter((model: any) => model.id)
  }

  if (provider === 'claude') {
    // Anthropic does not expose a public model-list endpoint. These are verified API model IDs.
    return [
      { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', provider },
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', provider },
    ]
  }

  const response = await fetch(`${providerEndpoints[provider]}/models`, { headers: providerHeaders(apiKey) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || `${provider} model discovery failed.`)
  return (data.data || []).map((model: any) => ({
    id: model.id,
    label: model.name || model.id,
    provider,
  })).filter((model: any) => model.id)
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]
  const candidate = fenced || text.slice(text.indexOf('{') >= 0 ? text.indexOf('{') : 0)
  return JSON.parse(candidate)
}

async function requestProvider(provider: Provider, apiKey: string, model: string, prompt: string) {
  const system = 'You are Crimson, a university data-import assistant. Return only valid JSON in this shape: {"rows":[{"full_name":"","email":"","student_registration_number":"","gender":"male|female|other","course":"","faculty":"","university":""}]}. Never invent missing emails or registration numbers. Preserve invalid values so they can be rejected by validation.'

  if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${system}\n\n${prompt}` }] }] }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Gemini request failed.')
    return extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || '')
  }

  if (provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { ...providerHeaders(apiKey), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 4096, system, messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Claude request failed.')
    return extractJson(data.content?.[0]?.text || '')
  }

  const response = await fetch(`${providerEndpoints[provider]}/chat/completions`, {
    method: 'POST',
    headers: providerHeaders(apiKey),
    body: JSON.stringify({ model, temperature: 0, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || `${provider} request failed.`)
  return extractJson(data.choices?.[0]?.message?.content || '')
}

async function testProviderModel(provider: Provider, apiKey: string, model: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    if (provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }], generationConfig: { maxOutputTokens: 2 } }),
      })
      return response.ok
    }
    if (provider === 'claude') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: { ...providerHeaders(apiKey), 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 2, messages: [{ role: 'user', content: 'Reply with OK.' }] }),
      })
      return response.ok
    }
    const response = await fetch(`${providerEndpoints[provider]}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: providerHeaders(apiKey),
      body: JSON.stringify({ model, max_tokens: 2, temperature: 0, messages: [{ role: 'user', content: 'Reply with OK.' }] }),
    })
    return response.ok
  } finally {
    clearTimeout(timeout)
  }
}

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function isValidRow(row: any) {
  return row
    && row.status === 'valid_new'
    && typeof row.full_name === 'string'
    && row.full_name.trim().length > 0
    && isValidEmail(row.email)
    && typeof row.student_registration_number === 'string'
    && validateRegNumber(row.student_registration_number)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, prompt, provider, apiKey, model, rows } = body
    let authenticatedCoordinatorId: string | null = null

    const authClient = await createClient()
    const { data: { user: coordinator } } = await authClient.auth.getUser()
    if (!coordinator) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    const { data: coordinatorProfile } = await authClient
      .from('users')
      .select('id, role')
      .eq('id', coordinator.id)
      .single()
    if (!coordinatorProfile || !['coordinator', 'lecturer'].includes(coordinatorProfile.role)) {
      return NextResponse.json({ error: 'Coordinator access required.' }, { status: 403 })
    }
    authenticatedCoordinatorId = coordinatorProfile.id

    if (action === 'models') {
      if (!apiKey || !provider) return NextResponse.json({ error: 'Provider and API key are required.' }, { status: 400 })
      const discoveredModels = await discoverModels(provider as Provider, apiKey)
      const candidates = discoveredModels.filter((item: any) => !/(embed|guard|safety|translate|vision|video|diffusion|clip|retriever|detector|deplot|cosmos|neva|vila)/i.test(item.id))
      const testedModels: DiscoveredModel[] = []
      for (let index = 0; index < candidates.length; index += 5) {
        const batch = candidates.slice(index, index + 5)
        const results = await Promise.all(batch.map(async (item: any) => ({ item, usable: await testProviderModel(provider as Provider, apiKey, item.id).catch(() => false) })))
        testedModels.push(...results.filter((result) => result.usable).map((result) => result.item))
      }
      return NextResponse.json({ success: true, provider, models: testedModels, discovered: discoveredModels.length, tested: candidates.length })
    }

    if (action === 'preview') {
      const parsedRows: any[] = []
      let aiRows: any[] | null = null

      if (apiKey && model) {
        const result = await requestProvider(provider as Provider, apiKey, model, prompt)
        aiRows = Array.isArray(result?.rows) ? result.rows : []
      }

      const lines = prompt.split('\n').filter((l: string) => l.trim().length > 0)

      for (const line of lines) {
        const parts = line.split(/[,;\t|]+/).map((p: string) => p.trim())
        if (parts.length >= 2) {
          const regNoCandidate = parts.find((p: string) => /\d{2}\/\d/.test(p)) || parts[1] || ''
          const emailCandidate = parts.find((p: string) => p.includes('@')) || parts[2] || ''
          const genderCandidate = parts.find((p: string) => ['male', 'female', 'other'].includes(p.toLowerCase())) || 'female'
          const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate)

          parsedRows.push({
            full_name: parts[0] || 'Unknown Student',
            student_registration_number: regNoCandidate,
            email: emailCandidate,
            gender: genderCandidate.toLowerCase(),
            course: 'BSc Computer Science',
            faculty: 'Faculty of Computing',
            university: 'Ndejje University',
            isValidEmail,
            isValidReg: validateRegNumber(regNoCandidate),
          })
        }
      }

      if (aiRows) {
        parsedRows.length = 0
        for (const row of aiRows) {
          parsedRows.push({
            full_name: row.full_name || '',
            student_registration_number: row.student_registration_number || '',
            email: row.email || '',
            gender: row.gender || '',
            course: row.course || '',
            faculty: row.faculty || '',
            university: row.university || 'Ndejje University',
            isValidEmail: isValidEmail(row.email),
            isValidReg: validateRegNumber(row.student_registration_number || ''),
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
          isValidEmail: true,
          isValidReg: true,
        })
      }

      let existingEmails = new Set<string>()
      let existingRegs = new Set<string>()

      const supabase = await createClient()
      const { data: users } = await supabase.from('users').select('email, student_registration_number')
      ;(users || []).forEach((u: any) => {
        if (u.email) existingEmails.add(u.email.toLowerCase())
        if (u.student_registration_number) existingRegs.add(u.student_registration_number.toLowerCase())
      })

      const verifiedRows = parsedRows.map((r) => {
        const isDuplicateEmail = r.email ? existingEmails.has(r.email.toLowerCase()) : false
        const isDuplicateReg = r.student_registration_number ? existingRegs.has(r.student_registration_number.toLowerCase()) : false
        const isDuplicate = isDuplicateEmail || isDuplicateReg

        let status = 'valid_new'
        let notes = 'Ready for database insert'

        if (isDuplicate) {
          status = 'duplicate_skipped'
          notes = 'Duplicate record already exists in database'
        } else if (!r.isValidEmail) {
          status = 'invalid_email'
          notes = 'Invalid email address format (required for account creation)'
        } else if (!r.isValidReg) {
          status = 'invalid_reg'
          notes = 'Invalid Ndejje reg number format'
        }

        return {
          ...r,
          status,
          notes,
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
      const validRows = (rows || []).filter(isValidRow)

      if (validRows.length === 0) {
        return NextResponse.json({ error: 'No valid non-duplicate records to commit.' }, { status: 400 })
      }

      const now = new Date().toISOString()
      const inserted: any[] = []

      const supabase = createAdminClient()
      const existingEmails = new Set<string>()
      const existingRegs = new Set<string>()
      const { data: existingProfiles, error: existingProfilesError } = await supabase
        .from('users')
        .select('email, student_registration_number')
      if (existingProfilesError) throw existingProfilesError
      for (const profile of existingProfiles || []) {
        if (profile.email) existingEmails.add(profile.email.toLowerCase())
        if (profile.student_registration_number) existingRegs.add(profile.student_registration_number.toLowerCase())
      }

      for (const row of validRows) {
        const email = row.email.trim().toLowerCase()
        const registrationNumber = row.student_registration_number.trim().toUpperCase()
        if (existingEmails.has(email) || existingRegs.has(registrationNumber)) continue

        const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        if (authUsersError) throw authUsersError
        let authUser = authUsers.users.find((candidate) => candidate.email?.toLowerCase() === email)

        if (!authUser) {
          const created = await supabase.auth.admin.createUser({
            email,
            password: `${crypto.randomUUID()}Aa1!`,
            email_confirm: false,
            user_metadata: { full_name: row.full_name, role: 'student', status: 'normal' },
          })
          if (created.error || !created.data.user) throw created.error || new Error('Unable to create Auth user.')
          authUser = created.data.user
        }

        const profilePayload = {
          id: authUser.id,
          email,
          full_name: row.full_name.trim(),
          role: 'student',
          gender: row.gender,
          university: row.university || 'Ndejje University',
          student_registration_number: registrationNumber,
          faculty: row.faculty || 'Faculty of Computing',
          course: row.course || 'BSc Computer Science',
          status: 'normal',
        }
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', authUser.id)
          .maybeSingle()
        const { data: profile, error: profileError } = existingProfile
          ? await supabase.from('users').update(profilePayload).eq('id', authUser.id).select().single()
          : await supabase.from('users').insert(profilePayload).select().single()
        if (profileError) throw profileError
        inserted.push(profile)
        existingEmails.add(email)
        existingRegs.add(registrationNumber.toLowerCase())
      }

      if (inserted.length > 0) {
        const auditResult = await supabase.from('audit_logs').insert({
          user_id: authenticatedCoordinatorId,
          action: 'CRIMSON_AI_BULK_INSERT',
          entity_type: 'users',
          entity_id: inserted[0].id,
          new_data: { count: inserted.length, records: inserted },
        })
        if (auditResult.error) throw auditResult.error
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
