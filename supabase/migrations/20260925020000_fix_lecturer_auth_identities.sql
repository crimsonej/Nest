-- Fix: auth.identities entry is required for email/password login to work in Supabase.
-- Without it, the password check always fails silently.
-- This migration:
--   1. Patches any existing broken lecturer auth accounts by inserting missing auth.identities rows
--   2. Updates the trigger to always insert auth.identities alongside auth.users

create extension if not exists pgcrypto;

-- 1. Patch existing lecturer accounts that are missing an auth.identities row
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  au.id,                                                            -- identity id = user id for email provider
  au.id,                                                            -- user_id
  jsonb_build_object('sub', au.id::text, 'email', au.email),        -- identity_data
  'email',                                                          -- provider
  au.email,                                                         -- provider_id (email is the unique key)
  now(),
  au.created_at,
  au.updated_at
from auth.users au
join public.lecturers l on l.id = au.id
where not exists (
  select 1 from auth.identities ai where ai.user_id = au.id
)
on conflict do nothing;

-- 2. Update the trigger to insert auth.identities every time it creates an auth.users row
create or replace function public.prepare_lecturer_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_auth_id uuid;
  random_temp_password text;
  new_user_id uuid;
begin
  -- Generate a unique temp password: format XXXX-XXXX-XXXX
  random_temp_password := upper(substring(md5(gen_random_uuid()::text) from 1 for 4))
                       || '-'
                       || upper(substring(md5(gen_random_uuid()::text) from 1 for 4))
                       || '-'
                       || upper(substring(md5(gen_random_uuid()::text) from 1 for 4));

  new.temp_password     := random_temp_password;
  new.must_change_password := true;

  -- Resolve ID
  if new.id is null then
    select id into existing_auth_id from auth.users where email = new.email limit 1;
    new.id := coalesce(existing_auth_id, gen_random_uuid());
  end if;
  new_user_id := new.id;

  -- Create auth.users row if it doesn't exist yet
  if not exists (select 1 from auth.users where id = new_user_id or email = new.email) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      new.email,
      crypt(random_temp_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'must_change_password', true),
      jsonb_build_object('full_name', new.name),
      now(), now()
    );

    -- REQUIRED: insert auth.identities so email/password login works
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      new_user_id,
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', new.email),
      'email',
      new.email,
      now(), now(), now()
    )
    on conflict do nothing;
  end if;

  -- Upsert profile in public.users
  insert into public.users (id, full_name, email, role, phone_number, faculty_id, status)
  values (new_user_id, new.name, new.email, 'lecturer', new.phone_number, new.faculty_id, 'verified')
  on conflict (id) do update
  set role         = 'lecturer',
      full_name    = excluded.full_name,
      email        = excluded.email,
      phone_number = coalesce(excluded.phone_number, public.users.phone_number),
      faculty_id   = coalesce(excluded.faculty_id, public.users.faculty_id);

  return new;
end;
$$;

-- Re-attach trigger
drop trigger if exists before_lecturer_insert on public.lecturers;
create trigger before_lecturer_insert
before insert on public.lecturers
for each row execute function public.prepare_lecturer_account();
