-- Migration: Fix gender check constraint on public.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_gender_check;

ALTER TABLE public.users ADD CONSTRAINT users_gender_check 
  CHECK (lower(gender) IN ('male', 'female', 'other', 'prefer_not_to_say') OR gender IS NULL);
