-- Migration: Enforce must_change_password = true for all lecturers created with temp passwords
-- This ensures that any lecturer who has not completed setting a new password is forced to set one upon sign-in.

UPDATE public.lecturers
SET must_change_password = true
WHERE temp_password IS NOT NULL OR must_change_password IS NULL;

-- Also sync auth user app_metadata for all lecturers with active temp_passwords
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"must_change_password": true}'::jsonb
WHERE id IN (
  SELECT id FROM public.lecturers WHERE temp_password IS NOT NULL OR must_change_password IS TRUE
);
