# NEST SQL setup guide

This file gives you ready-to-use SQL snippets for a Supabase project.

## 1) Create database tables
Run the schema from:
- `supabase/schema/00_initial_schema.sql`
- `supabase/schema/01_universities_and_dynamic_rules.sql`

## 2) Seed example data
Run the files in order:
- `supabase/seed/01_course_units.sql`
- `supabase/seed/02_users_and_groups.sql`

## 3) Important note about IDs
The example data uses UUIDs. Replace them with real auth user IDs from Supabase Auth before using production data.

## 4) Create a Supabase auth user manually
In Supabase Dashboard:
- Authentication > Users > Add user
- create a coordinator user and 2-4 student users
- copy their UUIDs into the seed SQL before running it

## 5) Common SQL insert pattern
```sql
INSERT INTO public.users (id, email, full_name, role, student_registration_number, whatsapp_phone, course)
VALUES (
  'actual-uuid-from-auth',
  'student@university.edu',
  'Jane Doe',
  'student',
  'CS2025001',
  '+254712345678',
  'Computer Science'
);
```

## 6) Start the local app
From the project root:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

If the old static HTML page still appears, make sure you are opening the Next.js app route and not the root `index.html` from the older static project.
