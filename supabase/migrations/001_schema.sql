-- ============================================================
-- UniGroup – Database Schema
-- Run this in Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'coordinator')),
  reg_number TEXT UNIQUE,
  whatsapp TEXT,
  course TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- COURSE UNITS
-- ------------------------------------------------------------
CREATE TABLE public.course_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- ASSIGNMENTS (coursework)
-- ------------------------------------------------------------
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  min_size INT DEFAULT 2,
  max_size INT DEFAULT 5,
  deadline TIMESTAMPTZ,
  is_locked BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- GROUPS
-- ------------------------------------------------------------
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  course_unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  leader_id UUID REFERENCES public.profiles(id),
  leader_name TEXT,
  max_members INT DEFAULT 5,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  description TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- GROUP MEMBERS
-- ------------------------------------------------------------
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- ------------------------------------------------------------
-- JOIN REQUESTS (for private groups)
-- ------------------------------------------------------------
CREATE TABLE public.join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- ------------------------------------------------------------
-- TASKS (per-group task board)
-- ------------------------------------------------------------
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'submitted')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- AUDIT LOG (optional intervention tracking)
-- ------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Course units – readable by all authenticated
CREATE POLICY "Course units readable"
  ON public.course_units FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coordinators manage course units"
  ON public.course_units FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
  );

-- Assignments
CREATE POLICY "Assignments readable"
  ON public.assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coordinators manage assignments"
  ON public.assignments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
  );

-- Groups
CREATE POLICY "Groups readable"
  ON public.groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can create groups"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
  );

CREATE POLICY "Leaders and coordinators can update groups"
  ON public.groups FOR UPDATE TO authenticated
  USING (
    leader_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
  );

CREATE POLICY "Coordinators can delete groups"
  ON public.groups FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
  );

-- Group members
CREATE POLICY "Members readable"
  ON public.group_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can join groups"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator'
  ));

CREATE POLICY "Members or coordinators can leave/remove"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
  );

-- Join requests
CREATE POLICY "Join requests readable by involved parties"
  ON public.join_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.leader_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
  );

CREATE POLICY "Students can request to join"
  ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Tasks readable by group members"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = tasks.group_id AND gm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
  );

CREATE POLICY "Group members can manage tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = tasks.group_id AND gm.user_id = auth.uid()
    )
  );

-- Audit logs – coordinators only
CREATE POLICY "Coordinators read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
  );

CREATE POLICY "Coordinators write audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
  );

-- ============================================================
-- SEED DATA (sample course units)
-- ============================================================
INSERT INTO public.course_units (code, name, description) VALUES
  ('CSC 301', 'Data Structures & Algorithms', 'Core CS course on DSA'),
  ('CSC 310', 'Database Systems', 'Relational databases and SQL'),
  ('MTH 210', 'Linear Algebra', 'Vectors, matrices, linear transformations'),
  ('ENG 102', 'Academic Writing', 'Technical and academic writing skills'),
  ('CSC 401', 'Software Engineering', 'SE principles, design patterns, agile');

-- ============================================================
-- HELPER: Create a coordinator manually
-- After creating a user via Auth dashboard or signUp,
-- run: UPDATE profiles SET role = 'coordinator' WHERE email = 'coord@university.edu';
-- ============================================================
