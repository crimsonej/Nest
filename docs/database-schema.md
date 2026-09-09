# Database Schema Documentation

## Tables

### users
Extended profile table linked to auth.users

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, FK -> auth.users(id) |
| email | TEXT | NOT NULL, UNIQUE |
| full_name | TEXT | NOT NULL |
| role | user_role | NOT NULL DEFAULT 'student' |
| student_registration_number | TEXT | UNIQUE |
| whatsapp_phone | TEXT | |
| course | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### course_units
Academic courses managed by coordinators

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| code | TEXT | NOT NULL UNIQUE |
| name | TEXT | NOT NULL |
| description | TEXT | |
| coordinator_id | UUID | NOT NULL FK -> users(id) |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| max_group_size | INTEGER | NOT NULL DEFAULT 5 |
| min_group_size | INTEGER | NOT NULL DEFAULT 2 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### courseworks
Assignments, projects, labs within course units

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| course_unit_id | UUID | NOT NULL FK -> course_units(id) CASCADE |
| title | TEXT | NOT NULL |
| description | TEXT | |
| type | coursework_type | NOT NULL DEFAULT 'assignment' |
| max_group_size | INTEGER | NOT NULL DEFAULT 5 |
| min_group_size | INTEGER | NOT NULL DEFAULT 2 |
| allow_self_formation | BOOLEAN | NOT NULL DEFAULT TRUE |
| is_published | BOOLEAN | NOT NULL DEFAULT FALSE |
| lock_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### groups
Student groups for coursework

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| coursework_id | UUID | NOT NULL FK -> courseworks(id) CASCADE |
| name | TEXT | NOT NULL |
| description | TEXT | |
| leader_id | UUID | NOT NULL FK -> users(id) |
| is_private | BOOLEAN | NOT NULL DEFAULT FALSE |
| status | group_status | NOT NULL DEFAULT 'forming' |
| max_members | INTEGER | NOT NULL DEFAULT 5 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### group_members
Many-to-many relationship between users and groups

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| group_id | UUID | NOT NULL FK -> groups(id) CASCADE |
| user_id | UUID | NOT NULL FK -> users(id) CASCADE |
| role | TEXT | NOT NULL DEFAULT 'member' CHECK IN ('leader', 'member') |
| joined_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| UNIQUE | (group_id, user_id) | |

### group_join_requests
Requests to join private groups

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| group_id | UUID | NOT NULL FK -> groups(id) CASCADE |
| user_id | UUID | NOT NULL FK -> users(id) CASCADE |
| status | join_request_status | NOT NULL DEFAULT 'pending' |
| requested_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| reviewed_at | TIMESTAMPTZ | |
| reviewed_by | UUID | FK -> users(id) |
| UNIQUE | (group_id, user_id) | |

### tasks
Task tracking for individuals and groups

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| group_id | UUID | FK -> groups(id) CASCADE |
| user_id | UUID | NOT NULL FK -> users(id) CASCADE |
| coursework_id | UUID | NOT NULL FK -> courseworks(id) CASCADE |
| title | TEXT | NOT NULL |
| description | TEXT | |
| status | task_status | NOT NULL DEFAULT 'todo' |
| priority | task_priority | NOT NULL DEFAULT 'medium' |
| due_date | TIMESTAMPTZ | |
| submitted_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### resources
File sharing within groups

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| group_id | UUID | NOT NULL FK -> groups(id) CASCADE |
| uploaded_by | UUID | NOT NULL FK -> users(id) CASCADE |
| title | TEXT | NOT NULL |
| description | TEXT | |
| file_url | TEXT | NOT NULL |
| file_type | TEXT | NOT NULL |
| file_size | INTEGER | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### audit_logs
Comprehensive action logging

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| user_id | UUID | NOT NULL FK -> users(id) CASCADE |
| action | TEXT | NOT NULL |
| entity_type | TEXT | NOT NULL |
| entity_id | UUID | NOT NULL |
| old_data | JSONB | |
| new_data | JSONB | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### google_sheets_sync
Sync status tracking

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| entity_type | TEXT | NOT NULL CHECK IN ('group', 'student', 'coursework') |
| entity_id | UUID | NOT NULL |
| sync_status | sync_status | NOT NULL DEFAULT 'pending' |
| last_synced_at | TIMESTAMPTZ | |
| error_message | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Views

### dashboard_metrics
Aggregated metrics for coordinator dashboard

### group_monitor
Real-time group monitoring data

### unassigned_students
Students not in any active group

## Row Level Security Policies

All tables have RLS enabled with policies for:
- Students: Own data + peers in same course + published courseworks
- Coordinators: Full access to their course units' data
- Lecturers: View access to assigned course units

## Triggers

- `handle_updated_at()` - Auto-update updated_at timestamp
- `handle_new_user()` - Create profile on auth signup
- `trigger_group_sync()` - Queue Google Sheets sync on group changes
- `trigger_student_sync()` - Queue Google Sheets sync on student changes
- `trigger_coursework_sync()` - Queue Google Sheets sync on coursework changes