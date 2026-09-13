# NEST Supabase SQL files

Run these files in the Supabase Dashboard SQL Editor in this order.

## 1. Create the database
Run:

`supabase/schema/00_initial_schema.sql`

This creates the extensions, enum types, tables, indexes, RLS policies, functions, triggers, and dashboard views.

## 2. Create demo Auth users
Run:

`supabase/seed/00_demo_auth_users.sql`

This creates the coordinator and four student demo accounts automatically. The demo credentials are written at the top of that SQL file. The database trigger creates matching `public.users` profiles automatically.

`00_auth_user_setup.sql` remains available as a manual setup reference, but it is not needed for the demo data.

Do not insert sample profiles into `public.users` until these Auth users exist, because `public.users.id` references `auth.users.id`.

## 3. Add dynamic university and enrollment rules
Run:

`supabase/schema/01_universities_and_dynamic_rules.sql`

This adds universities, registration rules, student course-unit enrollment, selected-coordinator assignments, scoped policies, and database enforcement for group capacity and duplicate course-unit membership. It is safe to rerun.

## 4. Add faculties and courses
Run:

`supabase/seed/05_faculties_and_courses.sql`

This creates the faculty and degree/program course tables, adds sample faculty and courses, and connects course units to the Computer Science course.

## 5. Add course units and coursework
Run:

`supabase/seed/01_course_units.sql`

The demo SQL already uses the matching demo coordinator UUID, so no replacement is needed.

## 6. Add sample users, groups, members, and tasks
Run:

`supabase/seed/02_users_and_groups.sql`

The demo SQL already uses the matching demo Auth user UUIDs, so no replacement is needed.

## 7. Verify the installation
Run:

`supabase/seed/03_verify_setup.sql`

## 8. Normalize academic data and complete student profiles
Run:

`supabase/seed/06_normalize_academic_data.sql`

This adds a broader catalog of 18 programs across science and technology, business, engineering, and arts/social sciences. It keeps course codes abbreviated in student profiles, fills missing student registration numbers, phone numbers, faculty, and course values, distributes the generated demo students across different programs, and adds foreign-key-backed `faculty_id` and `course_id` selectors to student profiles. It is safe to rerun.

## 9. Enable optional live updates and file uploads
Run:

`supabase/seed/04_optional_realtime_storage.sql`

This enables Realtime for the main collaborative tables and creates the private `group-resources` Storage bucket. Resource files should use a path beginning with the group UUID, for example `GROUP_UUID/report.pdf`.

## Important

- Run the schema before the seed files.
- Do not run `supabase/migrations/001_schema.sql` together with the current schema. It belongs to an older design that uses `profiles` and `assignments`; the current app uses `users` and `courseworks`.
- Do not deploy `supabase/functions/sync-to-sheets` with the current schema. It also belongs to the older design and queries columns such as `profiles`, `leader_name`, `visibility`, and `is_locked` that the current schema does not use.
- The current Google Sheets functions are `google-sheets-sync` and `sync-scheduler`.
- Realtime and Storage setup is included in `04_optional_realtime_storage.sql`.
- Never use the service role key in browser code.
- Keep `.env.local` out of source control.
- The Google Sheets functions are separate and require Google credentials before deployment.
- The old root HTML files are not part of the Supabase setup.
