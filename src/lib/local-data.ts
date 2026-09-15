export type LocalTableName =
  | 'users'
  | 'course_units'
  | 'courseworks'
  | 'groups'
  | 'group_members'
  | 'group_join_requests'
  | 'tasks'
  | 'student_course_units'
  | 'selected_coordinators'
  | 'universities'
  | 'faculties'
  | 'courses'
  | 'audit_logs'
  | 'unassigned_students'

export function isLocalDataMode() {
  // The production app is configured to use the live Supabase project only.
  // Keep this helper present for compatibility, but never enable local demo mode.
  return false
}

export function validateRegNumber(regNo: string, pattern = '^\\d{2}/\\d+/\\d{3,4}/[A-Za-z]+/\\d+$') {
  if (!regNo) return false
  try {
    const regex = new RegExp(pattern, 'i')
    return regex.test(regNo.trim())
  } catch {
    return true
  }
}

export function filterUserForPrivacy(targetUser: any, currentUserId: string, state: Record<LocalTableName, any[]>) {
  if (!targetUser) return targetUser
  if (targetUser.id === currentUserId) return targetUser

  const currentGroupIds = new Set(
    (state.group_members || []).filter((gm) => gm.user_id === currentUserId).map((gm) => gm.group_id)
  )
  const isPeerInSameGroup = (state.group_members || []).some(
    (gm) => gm.user_id === targetUser.id && currentGroupIds.has(gm.group_id)
  )

  if (!isPeerInSameGroup) {
    return {
      ...targetUser,
      whatsapp_phone: null,
      email: `${targetUser.email?.split('@')[0]?.slice(0, 3)}***@nest.edu`,
    }
  }

  return targetUser
}


const localDataListeners = new Set<(table: string) => void>()

export function subscribeLocalData(listener: (table: string) => void) {
  // Local demo subscriptions are intentionally disabled in production mode.
  return () => undefined
}

function notifyLocalDataChanged(table: string) {
  localDataListeners.forEach((listener) => listener(table))
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('nest-local-state-v2', JSON.stringify(getLocalState()))
    window.localStorage.setItem('nest-local-data-change', `${table}:${Date.now()}`)
  }
}

const now = new Date().toISOString()

const additionalStudentNames = [
  ['Mariam Nansubuga', 'female'],
  ['Brian Okello', 'male'],
  ['Sarah Atim', 'female'],
  ['Joshua Mugisha', 'male'],
  ['Grace Namirembe', 'female'],
  ['Isaac Wanyama', 'male'],
  ['Ruth Achieng', 'female'],
  ['Daniel Ssekabira', 'male'],
  ['Esther Nakitto', 'female'],
  ['Patrick Ouma', 'male'],
  ['Agnes Nabirye', 'female'],
  ['Samuel Tumusiime', 'male'],
  ['Lydia Nambooze', 'female'],
  ['Michael Kintu', 'male'],
  ['Rebecca Adongo', 'female'],
  ['Joseph Byaruhanga', 'male'],
  ['Phiona Namukasa', 'female'],
  ['Emmanuel Ochieng', 'male'],
  ['Hannah Katusiime', 'female'],
  ['Robert Mugerwa', 'male'],
  ['Joan Nabukenya', 'female'],
  ['Andrew Lwanga', 'male'],
  ['Mary Akello', 'female'],
  ['Victor Kakeeto', 'male'],
  ['Diana Nambasa', 'female'],
  ['Anthony Wekesa', 'male'],
  ['Clara Namatovu', 'female'],
  ['Martin Ssemanda', 'male'],
  ['Janet Auma', 'female'],
  ['Frank Kalyegira', 'male'],
  ['Olivia Namuddu', 'female'],
  ['George Odongo', 'male'],
  ['Naomi Nakimera', 'female'],
  ['Collins Okwir', 'male'],
  ['Stella Nabbosa', 'female'],
  ['Simon Kato', 'male'],
  ['Brenda Nanyonga', 'female'],
  ['Henry Mwesigwa', 'male'],
  ['Irene Namanya', 'female'],
  ['Moses Waiswa', 'male'],
  ['Catherine Nakanwagi', 'female'],
  ['Paul Ssentongo', 'male'],
  ['Alice Auma', 'female'],
  ['Dennis Mutebi', 'male'],
  ['Florence Nabunya', 'female'],
  ['Kenneth Olet', 'male'],
  ['Violet Nansubuga', 'female'],
] as const

const additionalStudents = additionalStudentNames.map(([fullName, gender], index) => ({
  id: `student-demo-${index + 3}`,
  email: `student${index + 3}@nest.edu`,
  full_name: fullName,
  role: 'student',
  gender,
  university: 'Ndejje University',
  student_registration_number: `26/2/${String(224 + index).padStart(3, '0')}/D/${String(2224 + index).padStart(4, '0')}`,
  whatsapp_phone: `+256700${String(200000 + index).padStart(6, '0')}`,
  faculty: 'Faculty of Computing',
  course: 'BSc Computer Science',
  status: 'normal',
  created_at: now,
  updated_at: now,
}))

const seedUsers = [
  {
    id: 'student-demo-1',
    email: 'student1@nest.edu',
    full_name: 'Aisha Nakato',
    role: 'student',
    gender: 'female',
    university: 'Ndejje University',
    student_registration_number: '26/2/222/D/2222',
    whatsapp_phone: '+256700123456',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    status: 'normal',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'student-demo-2',
    email: 'student2@nest.edu',
    full_name: 'David Kato',
    role: 'student',
    gender: 'male',
    university: 'Ndejje University',
    student_registration_number: '26/2/223/D/2223',
    whatsapp_phone: '+256770987654',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    status: 'normal',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'coordinator-demo-1',
    email: 'coordinator@nest.edu',
    full_name: 'Ndejje Faculty Coordinator',
    role: 'coordinator',
    gender: 'female',
    university: 'Ndejje University',
    student_registration_number: '99/1/111/D/9999',
    whatsapp_phone: '+256711555222',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    status: 'coordinator',
    created_at: now,
    updated_at: now,
  },
  ...additionalStudents,
]

const seedUniversities = [
  {
    id: 'university-demo-1',
    university: 'Ndejje University',
    abbreviation: 'NU',
    branch: 'Kampala Campus',
    location: 'Kampala, Uganda',
    accepted_reg_number: '^\\d{2}/\\d{1,2}/\\d{3,4}/[A-Z]/\\d{4}$',
    example_reg_number: '26/2/222/D/2222',
    created_at: now,
    updated_at: now,
  },
]

const seedCourseUnits = [
  {
    id: 'course-unit-1',
    code: 'CS101',
    name: 'Introduction to Programming',
    description: 'Programming foundations and problem solving',
    coordinator_id: 'coordinator-demo-1',
    is_active: true,
    max_group_size: 5,
    min_group_size: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'course-unit-2',
    code: 'CS102',
    name: 'Data Structures',
    description: 'Core abstract data types and complexity analysis',
    coordinator_id: 'coordinator-demo-1',
    is_active: true,
    max_group_size: 5,
    min_group_size: 2,
    created_at: now,
    updated_at: now,
  },
]

const seedCourseworks = [
  {
    id: 'coursework-1',
    course_unit_id: 'course-unit-1',
    title: 'Week 1 Programming Lab',
    description: 'Build a small JavaScript app and submit your code.',
    type: 'assignment',
    max_group_size: 5,
    min_group_size: 2,
    allow_self_formation: true,
    is_published: true,
    lock_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    created_at: now,
    updated_at: now,
  },
  {
    id: 'coursework-2',
    course_unit_id: 'course-unit-2',
    title: 'Data Structures Project',
    description: 'Create and explain a working tree traversal project.',
    type: 'project',
    max_group_size: 4,
    min_group_size: 2,
    allow_self_formation: true,
    is_published: true,
    lock_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    created_at: now,
    updated_at: now,
  },
]

const seedGroups = [
  {
    id: 'group-1',
    coursework_id: 'coursework-1',
    name: 'Code Sprint Crew',
    description: 'Working on the Week 1 programming lab together.',
    leader_id: 'student-demo-1',
    is_private: false,
    status: 'forming',
    max_members: 5,
    created_at: now,
    updated_at: now,
    coursework: {
      id: 'coursework-1',
      title: 'Week 1 Programming Lab',
      course_unit: { code: 'CS101', name: 'Introduction to Programming' },
    },
    leader: { full_name: 'Aisha Nakato', whatsapp_phone: '+256700123456' },
    members: [{ count: 2 }],
  },
]

const seedGroupMembers = [
  {
    id: 'member-1',
    group_id: 'group-1',
    user_id: 'student-demo-1',
    role: 'leader',
    joined_at: now,
    group: {
      id: 'group-1',
      coursework_id: 'coursework-1',
      name: 'Code Sprint Crew',
      status: 'forming',
      coursework: {
        id: 'coursework-1',
        title: 'Week 1 Programming Lab',
        course_unit: { code: 'CS101', name: 'Introduction to Programming' },
      },
    },
    groups: { coursework_id: 'coursework-1' },
  },
  {
    id: 'member-2',
    group_id: 'group-1',
    user_id: 'student-demo-2',
    role: 'member',
    joined_at: now,
    group: {
      id: 'group-1',
      coursework_id: 'coursework-1',
      name: 'Code Sprint Crew',
      status: 'forming',
      coursework: {
        id: 'coursework-1',
        title: 'Week 1 Programming Lab',
        course_unit: { code: 'CS101', name: 'Introduction to Programming' },
      },
    },
    groups: { coursework_id: 'coursework-1' },
  },
]

const seedTasks = [
  {
    id: 'task-1',
    group_id: 'group-1',
    user_id: 'student-demo-1',
    coursework_id: 'coursework-1',
    title: 'Submit the lab walkthrough',
    description: 'Upload the final solution and summary notes.',
    status: 'in_progress',
    priority: 'high',
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    created_at: now,
    updated_at: now,
  },
  {
    id: 'task-2',
    group_id: 'group-1',
    user_id: 'student-demo-2',
    coursework_id: 'coursework-1',
    title: 'Review the assignment brief',
    description: 'Review the requirement list and prepare questions.',
    status: 'todo',
    priority: 'medium',
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    created_at: now,
    updated_at: now,
  },
]

const seedStudentCourseUnits = [
  {
    id: 'student-course-1',
    user_id: 'student-demo-1',
    course_unit_id: 'course-unit-1',
    status: 'active',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'student-course-2',
    user_id: 'student-demo-1',
    course_unit_id: 'course-unit-2',
    status: 'active',
    created_at: now,
    updated_at: now,
  },
  ...additionalStudents.flatMap((student, index) => [
    {
      id: `student-course-${index + 3}-1`,
      user_id: student.id,
      course_unit_id: 'course-unit-1',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    ...(index % 2 === 0 ? [{
      id: `student-course-${index + 3}-2`,
      user_id: student.id,
      course_unit_id: 'course-unit-2',
      status: 'active',
      created_at: now,
      updated_at: now,
    }] : []),
  ]),
]

const seedFaculties = [
  { id: 'faculty-computing', code: 'FC', name: 'Faculty of Computing', is_active: true },
]

const seedCourses = [
  { id: 'course-computer-science', code: 'BSCS', name: 'BSc Computer Science', faculty_id: 'faculty-computing', is_active: true },
]

export function getLocalState() {
  if (!(globalThis as any).__nest_local_state) {
    const storedState = typeof window !== 'undefined' ? window.localStorage.getItem('nest-local-state-v2') : null
    ;(globalThis as any).__nest_local_state = storedState ? JSON.parse(storedState) : {
      users: seedUsers,
      universities: seedUniversities,
      course_units: seedCourseUnits,
      courseworks: seedCourseworks,
      groups: seedGroups,
      group_members: seedGroupMembers,
      group_join_requests: [],
      tasks: seedTasks,
      student_course_units: seedStudentCourseUnits,
      selected_coordinators: [],
      faculties: seedFaculties,
      courses: seedCourses,
      audit_logs: [],
      unassigned_students: [],
    }
  }

  return (globalThis as any).__nest_local_state as Record<LocalTableName, any[]>
}

export function getLocalUserByEmail(email: string) {
  const state = getLocalState()
  return state.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null
}

export function getLocalUserById(id: string) {
  const state = getLocalState()
  return state.users.find((user) => user.id === id) || null
}

type LocalFilter = { field: string; operator: 'eq' | 'in' | 'ilike' | 'gte' | 'lte' | 'is'; value: unknown }

function getNestedValue(row: Record<string, any>, field: string) {
  return field.split('.').reduce((value, key) => value?.[key], row)
}

function matchesFilters(row: Record<string, any>, filters: LocalFilter[]) {
  return filters.every(({ field, operator, value }) => {
    const current = getNestedValue(row, field)
    if (operator === 'eq') return current === value
    if (operator === 'in') return Array.isArray(value) ? (current == null ? false : value.includes(current)) : false
    if (operator === 'ilike') return String(current ?? '').toLowerCase().includes(String(value).replace(/%/g, '').toLowerCase())
    if (operator === 'gte') return current >= (value as any)
    if (operator === 'lte') return current <= (value as any)
    if (operator === 'is') return value === null ? current === null : current === value
    return true
  })
}

function relatedRows(table: LocalTableName, row: Record<string, any>, state: Record<LocalTableName, any[]>) {
  const courseUnits = state.course_units
  const courseworks = state.courseworks
  const groups = state.groups
  const members = state.group_members
  const users = state.users

  if (table === 'courseworks') {
    row.course_unit = courseUnits.find((unit) => unit.id === row.course_unit_id)
    row.groups = [{ count: groups.filter((group) => group.coursework_id === row.id).length }]
  }
  if (table === 'groups') {
    const coursework = courseworks.find((item) => item.id === row.coursework_id)
    row.coursework = coursework ? { ...coursework, course_unit: courseUnits.find((unit) => unit.id === coursework.course_unit_id) } : null
    row.leader = users.find((user) => user.id === row.leader_id) || null
    row.members = [{ count: members.filter((member) => member.group_id === row.id).length }]
  }
  if (table === 'group_members') {
    const group = groups.find((item) => item.id === row.group_id)
    row.group = group ? { ...group, coursework: courseworks.find((item) => item.id === group.coursework_id) } : null
    row.groups = group ? { coursework_id: group.coursework_id, status: group.status } : null
    row.user = users.find((user) => user.id === row.user_id) || null
  }
  if (table === 'tasks') {
    row.user = users.find((user) => user.id === row.user_id) || null
    row.coursework = courseworks.find((item) => item.id === row.coursework_id) || null
    row.group = groups.find((item) => item.id === row.group_id) || null
  }
  return row
}

function localRows(table: LocalTableName, state: Record<LocalTableName, any[]>) {
  if (table === 'unassigned_students') {
    const groupedIds = new Set(state.group_members.map((member) => member.user_id))
    return state.users.filter((user) => user.role === 'student' && !groupedIds.has(user.id))
  }
  return state[table] || []
}

class LocalQuery implements PromiseLike<{ data: any; error: any; count?: number }> {
  private filters: LocalFilter[] = []
  private sort: { field: string; ascending: boolean } | null = null
  private maxRows: number | null = null
  private selected = '*'
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: any = null
  private countRequested = false
  private headOnly = false

  constructor(private readonly table: LocalTableName, private readonly state: Record<LocalTableName, any[]>) {}

  select(selection = '*', options?: { count?: 'exact'; head?: boolean }) {
    if (this.action === 'select') this.action = 'select'
    this.selected = selection
    this.countRequested = options?.count === 'exact'
    this.headOnly = options?.head === true
    return this
  }

  eq(field: string, value: unknown) { this.filters.push({ field, operator: 'eq', value }); return this }
  in(field: string, value: unknown[]) { this.filters.push({ field, operator: 'in', value }); return this }
  ilike(field: string, value: string) { this.filters.push({ field, operator: 'ilike', value }); return this }
  gte(field: string, value: unknown) { this.filters.push({ field, operator: 'gte', value }); return this }
  lte(field: string, value: unknown) { this.filters.push({ field, operator: 'lte', value }); return this }
  is(field: string, value: unknown) { this.filters.push({ field, operator: 'is', value }); return this }
  order(field: string, options?: { ascending?: boolean }) { this.sort = { field, ascending: options?.ascending !== false }; return this }
  limit(value: number) { this.maxRows = value; return this }
  single() { this.maxRows = 1; return this }
  insert(payload: any) { this.action = 'insert'; this.payload = payload; return this }
  update(payload: any) { this.action = 'update'; this.payload = payload; return this }
  upsert(payload: any) { this.action = 'upsert'; this.payload = payload; return this }
  delete() { this.action = 'delete'; return this }

  private execute() {
    const rows = localRows(this.table, this.state)
    if (this.action === 'insert' || this.action === 'upsert') {
      const values = Array.isArray(this.payload) ? this.payload : [this.payload]
      const inserted = values.map((value) => ({ id: value.id || `${this.table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...value }))

      if (this.table === 'group_members') {
        const seen = new Set<string>()
        for (const row of rows) {
          if (row.group_id && row.user_id) seen.add(`${row.group_id}:${row.user_id}`)
        }
        const deduped: any[] = []
        for (const item of inserted) {
          const key = `${item.group_id}:${item.user_id}`
          if (item.group_id && item.user_id && seen.has(key)) continue
          deduped.push(item)
          if (item.group_id && item.user_id) seen.add(key)
        }
        inserted.splice(0, inserted.length, ...deduped)
      }

      if (this.table === 'group_join_requests') {
        const seen = new Set<string>()
        for (const row of rows) {
          if (row.group_id && row.user_id) seen.add(`${row.group_id}:${row.user_id}`)
        }
        const deduped: any[] = []
        for (const item of inserted) {
          const key = `${item.group_id}:${item.user_id}`
          if (item.group_id && item.user_id && seen.has(key)) continue
          deduped.push(item)
          if (item.group_id && item.user_id) seen.add(key)
        }
        inserted.splice(0, inserted.length, ...deduped)
      }

      if (this.action === 'upsert') {
        inserted.forEach((item) => {
          const index = rows.findIndex((row) => row.user_id === item.user_id && row.course_unit_id === item.course_unit_id)
          if (index >= 0) rows[index] = { ...rows[index], ...item }
          else rows.push(item)
        })
      } else rows.push(...inserted)
      notifyLocalDataChanged(this.table)
      return { data: inserted.length === 1 ? inserted[0] : inserted, error: null }
    }
    const matches = rows.filter((row) => matchesFilters(relatedRows(this.table, { ...row }, this.state), this.filters))
    if (this.action === 'update') {
      matches.forEach((row) => Object.assign(row, this.payload, { updated_at: new Date().toISOString() }))
      notifyLocalDataChanged(this.table)
      return { data: matches, error: null }
    }
    if (this.action === 'delete') {
      matches.forEach((row) => { const index = rows.indexOf(row); if (index >= 0) rows.splice(index, 1) })
      notifyLocalDataChanged(this.table)
      return { data: matches, error: null }
    }
    let result = matches.map((row) => relatedRows(this.table, { ...row }, this.state))
    if (this.sort) result.sort((left, right) => { const a = getNestedValue(left, this.sort!.field); const b = getNestedValue(right, this.sort!.field); return (a === b ? 0 : a > b ? 1 : -1) * (this.sort!.ascending ? 1 : -1) })
    if (this.maxRows !== null) result = result.slice(0, this.maxRows)
    if (this.headOnly) return { data: null, error: null, count: matches.length }
    if (this.maxRows === 1 && result.length === 0) return { data: null, error: null, count: this.countRequested ? matches.length : undefined }
    return { data: this.maxRows === 1 ? result[0] : result, error: null, count: this.countRequested ? matches.length : undefined }
  }

  then<TResult1 = { data: any; error: any; count?: number }, TResult2 = never>(onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

export function createLocalClient() {
  const state = getLocalState()
  const storageKey = 'nest-local-user-id'
  const getStoredUser = () => typeof window === 'undefined' ? null : getLocalUserById(window.localStorage.getItem(storageKey) || '')
  const notify = (event: string) => listeners.forEach((listener) => listener(event, getStoredUser()))
  const listeners = new Set<(event: string, user: any) => void>()

  return {
    auth: {
      getUser: async () => { const user = getStoredUser(); return { data: { user: user ? { id: user.id, email: user.email } : null }, error: null } },
      signInWithPassword: async ({ email }: { email: string }) => { const user = getLocalUserByEmail(email); if (!user) return { data: { user: null }, error: new Error('Local account not found.') }; if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, user.id); notify('SIGNED_IN'); return { data: { user: { id: user.id, email: user.email } }, error: null } },
      signUp: async ({ email, options }: { email: string; password: string; options?: { data?: Record<string, any> } }) => { const existing = getLocalUserByEmail(email); if (existing) return { data: { user: null }, error: new Error('An account with this email already exists.') }; const user = { id: `student-${Date.now()}`, email, full_name: options?.data?.full_name || email.split('@')[0], role: 'student', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...options?.data }; state.users.push(user); if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, user.id); notify('SIGNED_IN'); return { data: { user }, error: null } },
      signOut: async () => { if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey); notify('SIGNED_OUT'); return { error: null } },
      onAuthStateChange: (callback: (event: string, session: any) => void) => { const listener = (event: string, user: any) => callback(event, user ? { user: { id: user.id, email: user.email } } : null); listeners.add(listener); return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } } },
    },
    from: (table: string) => new LocalQuery(table as LocalTableName, state),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => undefined,
  } as any
}
