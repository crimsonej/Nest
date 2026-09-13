# NEST Architecture and Workflow

## Product Identity

NEST is a university coordination platform designed for course-unit grouping, student coordination, coursework tracking, and administrative oversight. It is built around a modular workflow where students, selected coordinators, and faculty coordinators work from a shared data model while preserving role-specific permissions.

## Core Data Model

### 1. Universities
A university is the top-level classification for registration rules and academic structure.

Required fields:
- university
- abbreviation
- branch
- location
- accepted_reg_number_pattern
- example_reg_number
- supported_intake_years
- programs

This is implemented as a dynamic rule structure in `src/lib/university-config.ts` and is intended to expand across multiple institutions rather than hard-coding a single public-facing layout.

### 2. Faculties
A faculty belongs to a university and groups departments and degree programs.

Suggested fields:
- id
- university_id
- name
- code
- is_active

### 3. Courses and Course Units
The application separates course metadata from specific course-unit instances.

Suggested fields:
- id
- faculty_id
- code
- name
- is_active
- course_level
- delivery_mode

Course units are the main enrollment container for students and groups.

### 4. Students and Users
The `users` table holds the core account and profile data.

Example fields:
- id
- email
- full_name
- role
- gender
- phone
- whatsapp_phone
- student_registration_number
- faculty
- course
- university
- status
- created_at

Student credentials and identity are connected with Supabase Auth while profile metadata remains in the `users` table.

### 5. Groups and Membership
Every group belongs to a specific course unit and has operational rules.

Suggested fields:
- id
- course_unit_id
- name
- created_by
- status
- max_capacity
- leader_id
- whatsapp_group_link
- visibility
- auto_lock_enabled
- created_at

Membership structure:
- group_members
  - id
  - group_id
  - user_id
  - role
  - joined_at
  - is_active

This allows duplicate-membership prevention and leader assignment logic.

### 6. Coursework and Tasks
Coursework is assigned to a course unit and may feed into student tracking and group-level work.

Suggested fields:
- id
- course_unit_id
- title
- description
- due_date
- max_score
- is_active
- created_by

Tasks may track completion, status, and due dates per class or group.

### 7. Audit Logs
A full audit log table should be used for every write operation that changes critical data.

Suggested fields:
- id
- actor_id
- entity_type
- entity_id
- action
- old_values
- new_values
- created_at

This is important for AI-driven changes, coordinator actions, and any rule-based update.

## Registration and Validation Rules

### University-Specific Registration Numbers
Registration numbers should be validated dynamically per university and per intake or faculty if the institution requires it.

Example:
- Ndejje University, Kampala Campus
- Pattern: `^\d{2}/\d{1,2}/\d{3,4}/[A-Z]/\d{4}$`
- Example: `26/2/222/D/2222`

This pattern should be stored in the university record and then validated in the form or server logic before the user can continue.

### Profile Validation Flow
1. User enters registration number on signup.
2. System checks selected university and faculty.
3. Matching regex is applied.
4. Form validation blocks invalid patterns before sign-up.
5. Duplicate registration numbers are checked against existing profile data.
6. Valid profile data is inserted into `users` and linked to the Auth account.

## Student Flow

### Signup Experience
A student account should capture:
- full name
- email
- password
- gender
- university
- faculty
- course
- registration number
- whatsapp phone
- course units enrolled in

The signup app should update the profile and then route the user to their dashboard or workspace.

### Student Visibility Rules
- Students should not view private profile details for unrelated users.
- A student can only see a classmate profile within the same group and only limited data should be shown.
- Profile data should be restricted to name, profile image, and WhatsApp number where relevant.
- Students may not join more than one group under the same course unit.
- Group-change requests may only be submitted within a short policy window after formation, as set by the coordinator.

## Group Formation Rules

### Group Constraints
- No duplicate course-unit memberships for the same student.
- Orphan students can be paired by a randomizer when the group is below capacity.
- Leaders can be assigned by system default or by the coordinator.
- Group rules must support gender balance ratios and optional override by the coordinator.
- Group members may have leader, member, or organizer roles.
- Coordinator-managed groups can be locked once the formation phase is closed.

### Randomizer Logic
The randomizer should:
- scan students without active group membership for a course unit
- pair them into new or existing groups
- respect capacity and gender constraints
- apply an audit log entry for all generated assignments

## Coordinator Workflow

### Coordinator Responsibilities
- create and manage course units
- assign or remove selected coordinators for a course unit
- manage group formation windows
- lock or unlock group creation
- review student registration data and reports
- approve or reject data updates from AI entry
- manage Google Sheets import or CSV upload flows

### Selected Coordinator
A selected coordinator is a role scoped to one assigned course unit. They have specific permissions but remain limited to the assigned unit.

They should be able to:
- create or update groups for that course unit
- review the unit roster
- assist in coursework management
- export spreadsheets for the unit

## AI Entry Workflow

The AI page should be protected and only accessible to faculty coordinators.

### Crimson AI Design Requirements
- provider selection: Gemini, Nvidia, OpenRouter, Claude
- prompt-based search and summarization over the database
- data-entry preview before writing
- clear audit log generation for all AI actions
- confirmation step before write operation is approved

### Safety Model
- AI must never modify data without a preview preview review.
- Every AI-driven change must create an audit record.
- The system should reject unsafe or malformed data payloads before writing.
- All previewed changes should show both old and new values.

## Data Import and Spreadsheet Sync

### Supported sources
- Google Sheets
- CSV upload
- direct manual entry
- AI-assisted parsing from PDF or image content

### Safe import flow
1. Import data from source.
2. Normalize fields.
3. Check for duplicates and invalid emails/IDs.
4. Validate against university rules and course-unit enrollment rules.
5. Show preview before write.
6. Save accepted rows and log all changes.

## Theme and Accessibility

### Theme Modes
NEST should support:
- light
- mid
- dark

The design should use smooth transitions and maintain accessibility contrast in each mode.

### Accessibility
- readable contrast in all modes
- keyboard interaction support
- focus rings for form elements
- WhatsApp data restricted to authorized group members only
- group links and contact details should remain controlled by coordinator setup and visibility rules

## Recommended Implementation Roadmap

1. Harden the app build and production route logic.
2. Implement a dynamic university rules engine and validation layer.
3. Add real database tables and constraints for universities, faculties, course units, and students.
4. Build the student signup and group-rule workflow.
5. Add coordinator dashboards and selected-coordinator permissions.
6. Create the AI entry preview workflow with audit logging.
7. Integrate CSV/Sheets import and deduplication logic.
8. Finalize accessibility, theme polish, and mobile optimization.

## Credits

This project is created by Kibirige Joachim Elijah.
GitHub: https://github.com/crimsonej/crimsonej
