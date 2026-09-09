# Coordinator Dashboard Components

## 1. Course Unit Overview Panel

### Metric Cards
- **Active Course Units** - Count of course_units where is_active = true
- **Total Students** - Count of users with role='student'
- **Total Formed Groups** - Count of groups with status in ('forming', 'active')
- **Group Formation Rate** - Percentage of students in groups
- **Unassigned Students** - Students not in any active group
- **Pending Join Requests** - Count of group_join_requests with status='pending'

### Data Source
```sql
-- Dashboard metrics view
SELECT 
  (SELECT COUNT(*) FROM course_units WHERE is_active = TRUE) as active_course_units,
  (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
  (SELECT COUNT(*) FROM groups WHERE status IN ('forming', 'active')) as total_groups,
  ROUND(
    (SELECT COUNT(*) FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     WHERE g.status IN ('forming', 'active'))::numeric 
    / NULLIF((SELECT COUNT(*) FROM users WHERE role = 'student'), 0) * 100, 2
  ) as group_formation_rate,
  (SELECT COUNT(*) FROM users u
   WHERE u.role = 'student'
   AND NOT EXISTS (
     SELECT 1 FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     WHERE gm.user_id = u.id AND g.status IN ('forming', 'active')
   )) as unassigned_students,
  (SELECT COUNT(*) FROM group_join_requests WHERE status = 'pending') as pending_join_requests;
```

## 2. Real-Time Group Monitor Table

### Columns
- Course Code (from course_units.code)
- Coursework Title
- Group Name
- Group Leader (from users.full_name)
- Member Count / Max Members
- Status Badge (forming/active/locked/completed/disbanded)
- Lock Toggle (Coordinator only)
- Actions (View/Edit)

### Real-time Updates
Uses Supabase Realtime subscription on `groups` table with filters

### Data Source
```sql
-- Group monitor view
SELECT 
  g.id,
  cu.code as course_code,
  cw.title as coursework_title,
  g.name as group_name,
  u.full_name as leader_name,
  COUNT(gm.id) as member_count,
  g.max_members,
  g.status,
  g.status = 'locked' as is_locked,
  g.created_at
FROM groups g
JOIN courseworks cw ON cw.id = g.coursework_id
JOIN course_units cu ON cu.id = cw.course_unit_id
JOIN users u ON u.id = g.leader_id
LEFT JOIN group_members gm ON gm.group_id = g.id
GROUP BY g.id, cu.code, cw.title, g.name, u.full_name, g.max_members, g.status, g.created_at;
```

## 3. Action Controls

### Lock Group Formation
- Toggle group status between 'active'/'forming' and 'locked'
- Disables student modifications (join/leave/create)
- Immediate real-time update

### Export to Spreadsheet
- CSV download of current filtered view
- Triggers Google Sheets sync via Edge Function

## 4. Intervention Controls

### Unassigned Students View
- Query: Students with role='student' not in any active group
- Display: Name, Email, Reg Number, Course, WhatsApp
- Action: Assign to group button

### Force Add/Remove
- Coordinator can add any student to any group (bypasses limits)
- Coordinator can remove any student from any group
- Logs to audit_logs table

## Auto-Fill Randomizer
- Takes all unassigned students
- Shuffles randomly
- Assigns to groups with available capacity
- Respects max_group_size
- Skips private groups