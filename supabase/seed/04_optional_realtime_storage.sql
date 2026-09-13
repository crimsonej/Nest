-- OPTIONAL NEST FEATURES
-- Run after 00_initial_schema.sql if the app will use live updates or file uploads.

-- Enable Realtime for tables used by the dashboards.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'courseworks',
    'groups',
    'group_members',
    'group_join_requests',
    'tasks',
    'resources'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END;
$$;

-- Create a private bucket for group resources.
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-resources', 'group-resources', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Group members can view resource files" ON storage.objects;
CREATE POLICY "Group members can view resource files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'group-resources'
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.group_id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Group members can upload resource files" ON storage.objects;
CREATE POLICY "Group members can upload resource files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'group-resources'
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.group_id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Group members can delete resource files" ON storage.objects;
CREATE POLICY "Group members can delete resource files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'group-resources'
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.group_id::text = (storage.foldername(name))[1]
  )
);
