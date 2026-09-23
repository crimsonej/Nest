-- Migration: Lecturer must-change-password enforcement
-- Adds must_change_password and temp_password to public.lecturers.
-- The trigger now generates a UNIQUE random temp password per lecturer (no shared hardcoded password).
-- The app redirects lecturers to /lecturer/change-password until they set their own password.

-- Enable pgcrypto for password hashing
create extension if not exists pgcrypto;

-- 1. Add must_change_password flag and temp_password to public.lecturers
alter table public.lecturers
  add column if not exists must_change_password boolean not null default true,
  add column if not exists temp_password text;

comment on column public.lecturers.must_change_password
  is 'When true, lecturer must change their password before accessing the portal. Cleared via /api/lecturer/clear-must-change-password after supabase.auth.updateUser().';

comment on column public.lecturers.temp_password
  is 'Unique plaintext temporary password shown to admin once. Cleared after the lecturer changes their password.';

-- 2. Update the prepare_lecturer_account trigger to use a unique random temp password per lecturer
create or replace function public.prepare_lecturer_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_auth_id uuid;
  random_temp_password text;
begin
  -- Generate a unique temp password: 3 words from random data (readable format)
  random_temp_password := upper(substring(md5(gen_random_uuid()::text) from 1 for 4))
                       || '-'
                       || upper(substring(md5(gen_random_uuid()::text) from 1 for 4))
                       || '-'
                       || upper(substring(md5(gen_random_uuid()::text) from 1 for 4));

  -- Store temp password on the record (plaintext, for admin to communicate to lecturer)
  new.temp_password := random_temp_password;
  new.must_change_password := true;

  -- Ensure new.id is set
  if new.id is null then
    select id into existing_auth_id from auth.users where email = new.email limit 1;
    if existing_auth_id is not null then
      new.id := existing_auth_id;
    else
      new.id := gen_random_uuid();
    end if;
  end if;

  -- Create auth.users entry if missing (unique temp password per lecturer)
  if not exists (select 1 from auth.users where id = new.id or email = new.email) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      new.id,
      'authenticated',
      'authenticated',
      new.email,
      crypt(random_temp_password, gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', array['email'],
        'must_change_password', true
      ),
      jsonb_build_object('full_name', new.name),
      now(), now()
    );
  end if;

  -- Upsert profile in public.users
  insert into public.users (id, full_name, email, role, phone_number, faculty_id, status)
  values (new.id, new.name, new.email, 'lecturer', new.phone_number, new.faculty_id, 'verified')
  on conflict (id) do update
  set role = 'lecturer',
      full_name = excluded.full_name,
      email = excluded.email,
      phone_number = coalesce(excluded.phone_number, public.users.phone_number),
      faculty_id = coalesce(excluded.faculty_id, public.users.faculty_id);

  return new;
end;
$$;

-- Re-create the before insert trigger
drop trigger if exists before_lecturer_insert on public.lecturers;
create trigger before_lecturer_insert
before insert on public.lecturers
for each row execute function public.prepare_lecturer_account();
