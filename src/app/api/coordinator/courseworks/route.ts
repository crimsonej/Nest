import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, description, type, max_group_size, min_group_size, allow_self_formation, is_published, lock_at, course_unit_id, work_style, submission_mode } = body

    if (!title || !course_unit_id) {
      return NextResponse.json({ error: 'Title and course_unit_id are required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const insertData = {
      title,
      description: description || null,
      type: type || 'assignment',
      max_group_size: max_group_size ?? 5,
      min_group_size: min_group_size ?? 2,
      allow_self_formation: allow_self_formation ?? true,
      is_published: is_published ?? false,
      lock_at: lock_at || null,
      course_unit_id,
      work_style: work_style || 'group_work',
      submission_mode: submission_mode || 'email',
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('courseworks').insert(insertData).select()
    if (error) {
      console.error('Error in POST /api/coordinator/courseworks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Unexpected error in POST /api/coordinator/courseworks:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, title, description, type, max_group_size, min_group_size, allow_self_formation, is_published, lock_at, course_unit_id, work_style, submission_mode } = body

    if (!id) {
      return NextResponse.json({ error: 'Coursework id is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const updateData = {
      title,
      description: description || null,
      type,
      max_group_size,
      min_group_size,
      allow_self_formation,
      is_published,
      lock_at: lock_at || null,
      course_unit_id,
      work_style,
      submission_mode,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('courseworks').update(updateData).eq('id', id).select()
    if (error) {
      console.error('Error in PUT /api/coordinator/courseworks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Unexpected error in PUT /api/coordinator/courseworks:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Coursework id parameter is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('courseworks').delete().eq('id', id)
    if (error) {
      console.error('Error in DELETE /api/coordinator/courseworks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/coordinator/courseworks:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
