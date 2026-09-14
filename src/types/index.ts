export type UserRole = 'student' | 'coordinator' | 'lecturer'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  gender?: 'male' | 'female' | 'other'
  university?: string
  student_registration_number?: string
  whatsapp_phone?: string
  faculty?: string
  course?: string
  avatar_url?: string
  status?: 'normal' | 'coordinator' | 'selected_coordinator'
  created_at: string
  updated_at: string
}

export interface CourseUnit {
  id: string
  code: string
  name: string
  description?: string
  coordinator_id: string
  is_active: boolean
  max_group_size: number
  min_group_size: number
  created_at: string
  updated_at: string
}

export interface Coursework {
  id: string
  course_unit_id: string
  title: string
  description?: string
  type: 'assignment' | 'project' | 'presentation' | 'lab'
  max_group_size: number
  min_group_size: number
  allow_self_formation: boolean
  is_published: boolean
  lock_at?: string
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  coursework_id: string
  name: string
  description?: string
  leader_id: string
  is_private: boolean
  status: 'forming' | 'active' | 'locked' | 'completed' | 'disbanded'
  max_members: number
  created_at: string
  updated_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'leader' | 'member'
  joined_at: string
}

export interface GroupJoinRequest {
  id: string
  group_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at?: string
  reviewed_by?: string
}

export interface Task {
  id: string
  group_id?: string
  user_id: string
  coursework_id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'submitted' | 'graded'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  submitted_at?: string
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  group_id: string
  uploaded_by: string
  title: string
  description?: string
  file_url: string
  file_type: string
  file_size: number
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  created_at: string
}

export interface GoogleSheetsSync {
  id: string
  entity_type: 'group' | 'student' | 'coursework'
  entity_id: string
  sync_status: 'pending' | 'synced' | 'failed'
  last_synced_at?: string
  error_message?: string
  created_at: string
}

export interface DashboardMetrics {
  active_course_units: number
  total_students: number
  total_groups: number
  group_formation_rate: number
  unassigned_students: number
  pending_join_requests: number
}

export interface GroupMonitorRow {
  id: string
  course_code: string
  coursework_title: string
  group_name: string
  leader_name: string
  member_count: number
  max_members: number
  status: Group['status']
  is_locked: boolean
  created_at: string
}

export interface UnassignedStudent {
  id: string
  full_name: string
  email: string
  student_registration_number: string
  course: string
  whatsapp_phone: string
}

export interface CSVImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    error: string
    data: Record<string, string>
  }>
}