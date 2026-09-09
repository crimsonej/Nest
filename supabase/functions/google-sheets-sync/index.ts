import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleAuth } from "https://esm.sh/google-auth-library@9"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncPayload {
  entity_type: 'group' | 'student' | 'coursework'
  entity_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const googleSheetsClientEmail = Deno.env.get('GOOGLE_SHEETS_CLIENT_EMAIL')
    const googleSheetsPrivateKey = Deno.env.get('GOOGLE_SHEETS_PRIVATE_KEY')?.replace(/\\n/g, '\n')
    const googleSheetsSpreadsheetId = Deno.env.get('GOOGLE_SHEETS_SPREADSHEET_ID')

    if (!googleSheetsClientEmail || !googleSheetsPrivateKey || !googleSheetsSpreadsheetId) {
      throw new Error('Google Sheets credentials not configured')
    }

    const auth = new GoogleAuth({
      credentials: {
        client_email: googleSheetsClientEmail,
        private_key: googleSheetsPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()

    const { entity_type, entity_id } = await req.json() as SyncPayload

    let sheetName = ''
    let headers: string[] = []
    let rowData: any[] = []

    switch (entity_type) {
      case 'group': {
        const { data: group } = await supabase
          .from('groups')
          .select(`
            *,
            coursework:courseworks(title, course_unit:course_units(code, name)),
            leader:users!groups_leader_id_fkey(full_name, email),
            members:group_members(user_id, role, joined_at, user:users(full_name, email, student_registration_number, course, whatsapp_phone))
          `)
          .eq('id', entity_id)
          .single()

        if (!group) throw new Error('Group not found')

        sheetName = 'Groups'
        headers = [
          'Group ID', 'Course Code', 'Coursework', 'Group Name', 'Description',
          'Leader Name', 'Leader Email', 'Status', 'Visibility', 'Max Members',
          'Current Members', 'Created At'
        ]
        rowData = [
          group.id,
          group.coursework?.course_unit?.code || '',
          group.coursework?.title || '',
          group.name,
          group.description || '',
          group.leader?.full_name || '',
          group.leader?.email || '',
          group.status,
          group.is_private ? 'Private' : 'Public',
          group.max_members,
          group.members?.length || 0,
          new Date(group.created_at).toISOString(),
        ]
        break
      }
      case 'student': {
        const { data: student } = await supabase
          .from('users')
          .select('*')
          .eq('id', entity_id)
          .eq('role', 'student')
          .single()

        if (!student) throw new Error('Student not found')

        sheetName = 'Students'
        headers = [
          'Student ID', 'Full Name', 'Email', 'Registration Number',
          'Course', 'WhatsApp Phone', 'Role', 'Created At'
        ]
        rowData = [
          student.id,
          student.full_name,
          student.email,
          student.student_registration_number || '',
          student.course || '',
          student.whatsapp_phone || '',
          student.role,
          new Date(student.created_at).toISOString(),
        ]
        break
      }
      case 'coursework': {
        const { data: coursework } = await supabase
          .from('courseworks')
          .select(`
            *,
            course_unit:course_units(code, name),
            groups:groups(count)
          `)
          .eq('id', entity_id)
          .single()

        if (!coursework) throw new Error('Coursework not found')

        sheetName = 'Coursework'
        headers = [
          'Coursework ID', 'Course Code', 'Course Name', 'Title', 'Description',
          'Type', 'Min Group Size', 'Max Group Size', 'Self Formation',
          'Published', 'Lock Date', 'Groups Count', 'Created At'
        ]
        rowData = [
          coursework.id,
          coursework.course_unit?.code || '',
          coursework.course_unit?.name || '',
          coursework.title,
          coursework.description || '',
          coursework.type,
          coursework.min_group_size,
          coursework.max_group_size,
          coursework.allow_self_formation ? 'Yes' : 'No',
          coursework.is_published ? 'Yes' : 'No',
          coursework.lock_at ? new Date(coursework.lock_at).toISOString() : '',
          coursework.groups?.[0]?.count || 0,
          new Date(coursework.created_at).toISOString(),
        ]
        break
      }
    }

    // Check if sheet exists, create if not
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsSpreadsheetId}`
    const sheetResponse = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const sheetData = await sheetResponse.json()
    const sheetExists = sheetData.sheets?.some((s: any) => s.properties.title === sheetName)

    if (!sheetExists) {
      await fetch(`${sheetsUrl}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: { title: sheetName },
            },
          }],
        }),
      })

      // Add headers
      await fetch(`${sheetsUrl}/values/${sheetName}!A1:append?valueInputOption=RAW`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [headers] }),
      })
    }

    // Append or update row
    const range = `${sheetName}!A:Z`
    const getResponse = await fetch(`${sheetsUrl}/values/${range}?key=`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const getData = await getResponse.json()
    const rows = getData.values || []

    // Find existing row by ID (first column)
    let rowIndex = -1
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === entity_id) {
        rowIndex = i + 1 // 1-indexed, plus header row
        break
      }
    }

    if (rowIndex > 0) {
      // Update existing row
      await fetch(`${sheetsUrl}/values/${sheetName}!A${rowIndex}:append?valueInputOption=RAW`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowData] }),
      })
    } else {
      // Append new row
      await fetch(`${sheetsUrl}/values/${sheetName}!A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowData] }),
      })
    }

    // Update sync status in database
    await supabase
      .from('google_sheets_sync')
      .upsert({
        entity_type,
        entity_id,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        error_message: null,
      }, {
        onConflict: 'entity_type,entity_id',
      })

    return new Response(JSON.stringify({ success: true, sheet: sheetName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Sync error:', error)

    // Update sync status to failed
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { entity_type, entity_id } = await req.json().catch(() => ({}))

    if (entity_type && entity_id) {
      await supabase
        .from('google_sheets_sync')
        .upsert({
          entity_type,
          entity_id,
          sync_status: 'failed',
          error_message: error.message,
        }, {
          onConflict: 'entity_type,entity_id',
        })
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})