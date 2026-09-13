-- University Course Group Management System
-- Supabase PostgreSQL Schema with RLS

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student', 'coordinator', 'lecturer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_status') THEN
    CREATE TYPE group_status AS ENUM ('forming', 'active', 'locked', 'completed', 'disbanded');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coursework_type') THEN
    CREATE TYPE coursework_type AS ENUM ('assignment', 'project', 'presentation', 'lab');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'submitted', 'graded');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'join_request_status') THEN
    CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN
    CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'failed');
  END IF;
END $$;

-- Faculties and degree/program courses
CREATE TABLE IF NOT EXISTS public.faculties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  student_registration_number TEXT UNIQUE,
  whatsapp_phone TEXT,
  faculty TEXT,
  course TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Course Units
CREATE TABLE IF NOT EXISTS public.course_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  coordinator_id UUID NOT NULL REFERENCES public.users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_group_size INTEGER NOT NULL DEFAULT 5,
  min_group_size INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coursework/Assignments
CREATE TABLE IF NOT EXISTS public.courseworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type coursework_type NOT NULL DEFAULT 'assignment',
  max_group_size INTEGER NOT NULL DEFAULT 5,
  min_group_size INTEGER NOT NULL DEFAULT 2,
  allow_self_formation BOOLEAN NOT NULL DEFAULT TRUE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  lock_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coursework_id UUID NOT NULL REFERENCES public.courseworks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID NOT NULL REFERENCES public.users(id),
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  status group_status NOT NULL DEFAULT 'forming',
  max_members INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group Members
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group Join Requests
CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status join_request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id),
  UNIQUE(group_id, user_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coursework_id UUID NOT NULL REFERENCES public.courseworks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resources
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Google Sheets Sync Tracking
CREATE TABLE IF NOT EXISTS public.google_sheets_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('group', 'student', 'coursework')),
  entity_id UUID NOT NULL,
  sync_status sync_status NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_sheets_sync_entity_unique
  ON public.google_sheets_sync(entity_type, entity_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_course ON public.users(course);
CREATE INDEX IF NOT EXISTS idx_courses_faculty ON public.courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_course_units_course ON public.course_units(course_id);
CREATE INDEX IF NOT EXISTS idx_courseworks_course_unit ON public.courseworks(course_unit_id);
CREATE INDEX IF NOT EXISTS idx_courseworks_published ON public.courseworks(is_published);
CREATE INDEX IF NOT EXISTS idx_groups_coursework ON public.groups(coursework_id);
CREATE INDEX IF NOT EXISTS idx_groups_status ON public.groups(status);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group ON public.group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user ON public.group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_status ON public.group_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_tasks_group ON public.tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_coursework ON public.tasks(coursework_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_resources_group ON public.resources(group_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_google_sheets_sync_entity ON public.google_sheets_sync(entity_type, entity_id);

-- Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courseworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_sheets_sync ENABLE ROW LEVEL SECURITY;

-- Users policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.users
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.users
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Coordinators can view all users'
  ) THEN
    CREATE POLICY "Coordinators can view all users" ON public.users
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Students can view peers in same course'
  ) THEN
    CREATE POLICY "Students can view peers in same course" ON public.users
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.users u1
          JOIN public.users u2 ON u1.course = u2.course
          WHERE u1.id = auth.uid() AND u2.id = users.id
        )
      );
  END IF;
END $$;

-- Course Units policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'faculties'
      AND policyname = 'Authenticated users can view active faculties'
  ) THEN
    CREATE POLICY "Authenticated users can view active faculties" ON public.faculties
      FOR SELECT USING (is_active = TRUE AND auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'faculties'
      AND policyname = 'Coordinators can manage faculties'
  ) THEN
    CREATE POLICY "Coordinators can manage faculties" ON public.faculties
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Authenticated users can view active courses'
  ) THEN
    CREATE POLICY "Authenticated users can view active courses" ON public.courses
      FOR SELECT USING (is_active = TRUE AND auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Coordinators can manage courses'
  ) THEN
    CREATE POLICY "Coordinators can manage courses" ON public.courses
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_units'
      AND policyname = 'Coordinators can manage own course units'
  ) THEN
    CREATE POLICY "Coordinators can manage own course units" ON public.course_units
      FOR ALL USING (coordinator_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_units'
      AND policyname = 'Students can view active course units'
  ) THEN
    CREATE POLICY "Students can view active course units" ON public.course_units
      FOR SELECT USING (is_active = TRUE);
  END IF;
END $$;

-- Courseworks policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courseworks'
      AND policyname = 'Coordinators can manage own courseworks'
  ) THEN
    CREATE POLICY "Coordinators can manage own courseworks" ON public.courseworks
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.course_units
          WHERE id = courseworks.course_unit_id AND coordinator_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courseworks'
      AND policyname = 'Students can view published courseworks'
  ) THEN
    CREATE POLICY "Students can view published courseworks" ON public.courseworks
      FOR SELECT USING (is_published = TRUE);
  END IF;
END $$;

-- Groups policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'groups'
      AND policyname = 'Coordinators can view all groups in their courseworks'
  ) THEN
    CREATE POLICY "Coordinators can view all groups in their courseworks" ON public.groups
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.courseworks cw
          JOIN public.course_units cu ON cu.id = cw.course_unit_id
          WHERE cw.id = groups.coursework_id AND cu.coordinator_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'groups'
      AND policyname = 'Students can view groups in their courseworks'
  ) THEN
    CREATE POLICY "Students can view groups in their courseworks" ON public.groups
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.courseworks cw
          JOIN public.course_units cu ON cu.id = cw.course_unit_id
          JOIN public.users u ON u.course = cu.code
          WHERE cw.id = groups.coursework_id AND u.id = auth.uid() AND cw.is_published = TRUE
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'groups'
      AND policyname = 'Students can create groups in allowed courseworks'
  ) THEN
    CREATE POLICY "Students can create groups in allowed courseworks" ON public.groups
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.courseworks cw
          WHERE cw.id = coursework_id
          AND cw.allow_self_formation = TRUE
          AND cw.is_published = TRUE
          AND (cw.lock_at IS NULL OR cw.lock_at > NOW())
        )
        AND leader_id = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'groups'
      AND policyname = 'Group leaders can update own groups'
  ) THEN
    CREATE POLICY "Group leaders can update own groups" ON public.groups
      FOR UPDATE USING (leader_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'groups'
      AND policyname = 'Coordinators can update any group in their courseworks'
  ) THEN
    CREATE POLICY "Coordinators can update any group in their courseworks" ON public.groups
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.courseworks cw
          JOIN public.course_units cu ON cu.id = cw.course_unit_id
          WHERE cw.id = groups.coursework_id AND cu.coordinator_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Group Members policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_members'
      AND policyname = 'Group members can view own group members'
  ) THEN
    CREATE POLICY "Group members can view own group members" ON public.group_members
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_members'
      AND policyname = 'Coordinators can view all group members'
  ) THEN
    CREATE POLICY "Coordinators can view all group members" ON public.group_members
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.groups g
          JOIN public.courseworks cw ON cw.id = g.coursework_id
          JOIN public.course_units cu ON cu.id = cw.course_unit_id
          WHERE g.id = group_members.group_id AND cu.coordinator_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_members'
      AND policyname = 'Students can join groups'
  ) THEN
    CREATE POLICY "Students can join groups" ON public.group_members
      FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = group_id
          AND g.status IN ('forming', 'active')
          AND (g.is_private = FALSE OR EXISTS (
            SELECT 1 FROM public.group_join_requests gjr
            WHERE gjr.group_id = g.id AND gjr.user_id = auth.uid() AND gjr.status = 'approved'
          ))
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_members'
      AND policyname = 'Group leaders can manage members'
  ) THEN
    CREATE POLICY "Group leaders can manage members" ON public.group_members
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = group_id AND g.leader_id = auth.uid()
          AND group_members.user_id != auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_members'
      AND policyname = 'Coordinators can manage any group members'
  ) THEN
    CREATE POLICY "Coordinators can manage any group members" ON public.group_members
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.groups g
          JOIN public.courseworks cw ON cw.id = g.coursework_id
          JOIN public.course_units cu ON cu.id = cw.course_unit_id
          WHERE g.id = group_members.group_id AND cu.coordinator_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Group Join Requests policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_join_requests'
      AND policyname = 'Students can view own join requests'
  ) THEN
    CREATE POLICY "Students can view own join requests" ON public.group_join_requests
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_join_requests'
      AND policyname = 'Group leaders can view requests for their groups'
  ) THEN
    CREATE POLICY "Group leaders can view requests for their groups" ON public.group_join_requests
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = group_join_requests.group_id AND g.leader_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_join_requests'
      AND policyname = 'Students can create join requests'
  ) THEN
    CREATE POLICY "Students can create join requests" ON public.group_join_requests
      FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = group_id AND g.is_private = TRUE AND g.status IN ('forming', 'active')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_join_requests'
      AND policyname = 'Group leaders can update requests'
  ) THEN
    CREATE POLICY "Group leaders can update requests" ON public.group_join_requests
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = group_join_requests.group_id AND g.leader_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_join_requests'
      AND policyname = 'Coordinators can manage all requests'
  ) THEN
    CREATE POLICY "Coordinators can manage all requests" ON public.group_join_requests
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.groups g
          JOIN public.courseworks cw ON cw.id = g.coursework_id
          JOIN public.course_units cu ON cu.id = cw.course_unit_id
          WHERE g.id = group_join_requests.group_id AND cu.coordinator_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Tasks policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'Users can view own tasks'
  ) THEN
    CREATE POLICY "Users can view own tasks" ON public.tasks
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'Group members can view group tasks'
  ) THEN
    CREATE POLICY "Group members can view group tasks" ON public.tasks
      FOR SELECT USING (
        group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = tasks.group_id AND gm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'Users can create own tasks'
  ) THEN
    CREATE POLICY "Users can create own tasks" ON public.tasks
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'Users can update own tasks'
  ) THEN
    CREATE POLICY "Users can update own tasks" ON public.tasks
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'Group leaders can update group tasks'
  ) THEN
    CREATE POLICY "Group leaders can update group tasks" ON public.tasks
      FOR UPDATE USING (
        group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = tasks.group_id AND g.leader_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'Coordinators can view all tasks in their courseworks'
  ) THEN
    CREATE POLICY "Coordinators can view all tasks in their courseworks" ON public.tasks
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.courseworks cw
          JOIN public.course_units cu ON cu.id = cw.course_unit_id
          WHERE cw.id = tasks.coursework_id AND cu.coordinator_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Resources policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resources'
      AND policyname = 'Group members can view resources'
  ) THEN
    CREATE POLICY "Group members can view resources" ON public.resources
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = resources.group_id AND gm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resources'
      AND policyname = 'Group members can upload resources'
  ) THEN
    CREATE POLICY "Group members can upload resources" ON public.resources
      FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resources'
      AND policyname = 'Coordinators can view all resources'
  ) THEN
    CREATE POLICY "Coordinators can view all resources" ON public.resources
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.groups g
          JOIN public.courseworks cw ON cw.id = g.coursework_id
          JOIN public.course_units cu ON cu.id = cw.course_unit_id
          WHERE g.id = resources.group_id AND cu.coordinator_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Audit Logs policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Coordinators can view audit logs'
  ) THEN
    CREATE POLICY "Coordinators can view audit logs" ON public.audit_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')
        )
      );
  END IF;
END $$;

-- Google Sheets Sync policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'google_sheets_sync'
      AND policyname = 'Coordinators can manage sync'
  ) THEN
    CREATE POLICY "Coordinators can manage sync" ON public.google_sheets_sync
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('coordinator', 'lecturer')
        )
      );
  END IF;
END $$;

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_users_updated_at'
  ) THEN
    CREATE TRIGGER set_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_faculties_updated_at'
  ) THEN
    CREATE TRIGGER set_faculties_updated_at
      BEFORE UPDATE ON public.faculties
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_courses_updated_at'
  ) THEN
    CREATE TRIGGER set_courses_updated_at
      BEFORE UPDATE ON public.courses
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_course_units_updated_at'
  ) THEN
    CREATE TRIGGER set_course_units_updated_at
      BEFORE UPDATE ON public.course_units
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_courseworks_updated_at'
  ) THEN
    CREATE TRIGGER set_courseworks_updated_at
      BEFORE UPDATE ON public.courseworks
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_groups_updated_at'
  ) THEN
    CREATE TRIGGER set_groups_updated_at
      BEFORE UPDATE ON public.groups
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_tasks_updated_at'
  ) THEN
    CREATE TRIGGER set_tasks_updated_at
      BEFORE UPDATE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue Google Sheets sync
CREATE OR REPLACE FUNCTION public.queue_google_sheets_sync(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.google_sheets_sync (entity_type, entity_id, sync_status)
  VALUES (p_entity_type, p_entity_id, 'pending')
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    sync_status = 'pending',
    error_message = NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for Google Sheets sync
CREATE OR REPLACE FUNCTION public.trigger_group_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.queue_google_sheets_sync('group', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_group_sync'
  ) THEN
    CREATE TRIGGER trigger_group_sync
      AFTER INSERT OR UPDATE ON public.groups
      FOR EACH ROW EXECUTE FUNCTION public.trigger_group_sync();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trigger_student_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.queue_google_sheets_sync('student', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_student_sync'
  ) THEN
    CREATE TRIGGER trigger_student_sync
      AFTER INSERT OR UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.trigger_student_sync();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trigger_coursework_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.queue_google_sheets_sync('coursework', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_coursework_sync'
  ) THEN
    CREATE TRIGGER trigger_coursework_sync
      AFTER INSERT OR UPDATE ON public.courseworks
      FOR EACH ROW EXECUTE FUNCTION public.trigger_coursework_sync();
  END IF;
END $$;

-- View for dashboard metrics
CREATE OR REPLACE VIEW public.dashboard_metrics AS
SELECT 
  (SELECT COUNT(*) FROM public.course_units WHERE is_active = TRUE) as active_course_units,
  (SELECT COUNT(*) FROM public.users WHERE role = 'student') as total_students,
  (SELECT COUNT(*) FROM public.groups WHERE status IN ('forming', 'active')) as total_groups,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.users WHERE role = 'student') > 0 
    THEN ROUND(
      (SELECT COUNT(*) FROM public.group_members gm
       JOIN public.groups g ON g.id = gm.group_id
       WHERE g.status IN ('forming', 'active'))::numeric 
      / (SELECT COUNT(*) FROM public.users WHERE role = 'student') * 100, 2)
    ELSE 0
  END as group_formation_rate,
  (SELECT COUNT(*) FROM public.users u
   WHERE u.role = 'student'
   AND NOT EXISTS (
     SELECT 1 FROM public.group_members gm
     JOIN public.groups g ON g.id = gm.group_id
     WHERE gm.user_id = u.id AND g.status IN ('forming', 'active')
   )) as unassigned_students,
  (SELECT COUNT(*) FROM public.group_join_requests WHERE status = 'pending') as pending_join_requests;

-- View for group monitor
CREATE OR REPLACE VIEW public.group_monitor AS
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
FROM public.groups g
JOIN public.courseworks cw ON cw.id = g.coursework_id
JOIN public.course_units cu ON cu.id = cw.course_unit_id
JOIN public.users u ON u.id = g.leader_id
LEFT JOIN public.group_members gm ON gm.group_id = g.id
GROUP BY g.id, cu.code, cw.title, g.name, u.full_name, g.max_members, g.status, g.created_at;

-- View for unassigned students
CREATE OR REPLACE VIEW public.unassigned_students AS
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.student_registration_number,
  u.course,
  u.whatsapp_phone
FROM public.users u
WHERE u.role = 'student'
AND NOT EXISTS (
  SELECT 1 FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = u.id AND g.status IN ('forming', 'active')
);