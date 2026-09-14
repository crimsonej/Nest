-- Store the student's selected profile portrait.

alter table public.users
  add column if not exists avatar_url text;