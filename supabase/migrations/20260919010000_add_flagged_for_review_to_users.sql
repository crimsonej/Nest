-- Add flagged_for_review and flag_reason columns to users table for administrative review of flagged accounts (e.g. duplicate name matches)

alter table public.users
  add column if not exists flagged_for_review boolean default false,
  add column if not exists flag_reason text default null;
