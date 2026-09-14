-- Add the new coursework metadata fields needed by the redesigned Course Work manager.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'coursework_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.coursework_type AS ENUM ('assignment', 'project', 'presentation', 'lab');
  END IF;
END $$;

ALTER TYPE public.coursework_type ADD VALUE IF NOT EXISTS 'coursework';

ALTER TABLE public.courseworks
  ADD COLUMN IF NOT EXISTS work_style TEXT NOT NULL DEFAULT 'group_work' CHECK (work_style IN ('group_work', 'personal')),
  ADD COLUMN IF NOT EXISTS submission_mode TEXT NOT NULL DEFAULT 'email' CHECK (submission_mode IN ('email', 'handwritten_copy', 'typed_printed'));

ALTER TABLE public.courseworks
  ALTER COLUMN work_style SET DEFAULT 'group_work',
  ALTER COLUMN submission_mode SET DEFAULT 'email';
