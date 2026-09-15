import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { code, name, description, course_id, faculty_id, coordinator_id, is_active, max_group_size, min_group_size, whatsapp_group_link } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const insertData = {
      code,
      name,
      description: description || null,
      course_id: course_id || null,
      faculty_id: faculty_id || null,
      coordinator_id: coordinator_id || null,
      is_active: is_active ?? true,
      max_group_size: max_group_size ?? 5,
      min_group_size: min_group_size ?? 2,
      whatsapp_group_link: whatsapp_group_link || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('course_units').insert(insertData).select()
    if (error) {
      console.error('Error in POST /api/coordinator/course-units:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Unexpected error in POST /api/coordinator/course-units:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, code, name, description, course_id, faculty_id, coordinator_id, is_active, max_group_size, min_group_size, whatsapp_group_link } = body

    if (!id) {
      return NextResponse.json({ error: 'Course unit id is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const updateData = {
      code,
      name,
      description: description || null,
      course_id: course_id || null,
      faculty_id: faculty_id || null,
      coordinator_id: coordinator_id || null,
      is_active: is_active ?? true,
      max_group_size: max_group_size ?? 5,
      min_group_size: min_group_size ?? 2,
      whatsapp_group_link: whatsapp_group_link || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('course_units').update(updateData).eq('id', id).select()
    if (error) {
      console.error('Error in PUT /api/coordinator/course-units:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Unexpected error in PUT /api/coordinator/course-units:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Course unit id parameter is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('course_units').delete().eq('id', id)
    if (error) {
      console.error('Error in DELETE /api/coordinator/course-units:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/coordinator/course-units:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
