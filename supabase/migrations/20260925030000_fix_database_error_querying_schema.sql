-- Fix: "Database error querying schema" on login
-- Cause: Direct SQL inserts into auth.users left GoTrue string columns as NULL.
-- GoTrue (Supabase Auth) requires token/change string columns to be empty strings ('') rather than NULL.
-- Note: 'phone' in auth.users must remain NULL when empty because auth.users has a UNIQUE constraint ("users_phone_key").
-- Note: public.users uses 'whatsapp_phone' (not 'phone_number') and allowed status values ('normal', 'coordinator', 'selected_coordinator', 'admin').

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0. Revert any empty string in auth.users.phone back to NULL to respect users_phone_key UNIQUE constraint
UPDATE auth.users
SET phone = NULL
WHERE phone = '';

-- 1. SANITIZE EXISTING auth.users ROWS (excluding phone)
UPDATE auth.users
SET 
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '');

-- 2. UPDATE TRIGGER FUNCTION TO PROPERLY INITIALIZE ALL auth.users & public.users COLUMNS
CREATE OR REPLACE FUNCTION public.prepare_lecturer_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_auth_id UUID;
  random_temp_password TEXT;
  new_user_id UUID;
BEGIN
  -- Generate a unique temp password: format XXXX-XXXX-XXXX
  random_temp_password := UPPER(SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 4))
                       || '-'
                       || UPPER(SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 4))
                       || '-'
                       || UPPER(SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 4));

  NEW.temp_password        := random_temp_password;
  NEW.must_change_password := true;

  -- Resolve ID
  IF NEW.id IS NULL THEN
    SELECT id INTO existing_auth_id FROM auth.users WHERE email = NEW.email LIMIT 1;
    NEW.id := COALESCE(existing_auth_id, gen_random_uuid());
  END IF;
  new_user_id := NEW.id;

  -- Create auth.users row if missing with token fields initialized to '' (leaving phone NULL)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = new_user_id OR email = NEW.email) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      NEW.email,
      crypt(random_temp_password, gen_salt('bf')),
      NOW(),
      '', '', '', '', '', '', '', '',
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'lecturer', 'must_change_password', true),
      jsonb_build_object('full_name', NEW.name),
      NOW(), NOW()
    );
  ELSE
    -- If user already exists in auth.users, ensure token fields are clean
    UPDATE auth.users
    SET 
      confirmation_token         = COALESCE(confirmation_token, ''),
      recovery_token             = COALESCE(recovery_token, ''),
      email_change_token_new     = COALESCE(email_change_token_new, ''),
      email_change               = COALESCE(email_change, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change               = COALESCE(phone_change, ''),
      phone_change_token         = COALESCE(phone_change_token, ''),
      reauthentication_token     = COALESCE(reauthentication_token, '')
    WHERE id = new_user_id;
  END IF;

  -- Ensure matching auth.identities entry exists
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', NEW.email),
    'email',
    NEW.email,
    NOW(), NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Upsert profile in public.users (uses whatsapp_phone and status = 'normal')
  INSERT INTO public.users (id, full_name, email, role, whatsapp_phone, faculty_id, status)
  VALUES (new_user_id, NEW.name, NEW.email, 'lecturer', NEW.phone_number, NEW.faculty_id, 'normal')
  ON CONFLICT (id) DO UPDATE
  SET role           = 'lecturer',
      full_name      = EXCLUDED.full_name,
      email          = EXCLUDED.email,
      whatsapp_phone = COALESCE(EXCLUDED.whatsapp_phone, public.users.whatsapp_phone),
      faculty_id     = COALESCE(EXCLUDED.faculty_id, public.users.faculty_id);

  RETURN NEW;
END;
$$;

-- Ensure trigger is active on public.lecturers
DROP TRIGGER IF EXISTS before_lecturer_insert ON public.lecturers;
CREATE TRIGGER before_lecturer_insert
BEFORE INSERT ON public.lecturers
FOR EACH ROW EXECUTE FUNCTION public.prepare_lecturer_account();

-- 3. ENSURE ALL EXISTING LECTURERS HAVE MATCHING AUTH & USERS ROWS
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM public.lecturers LOOP
    -- Ensure auth.users row exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = rec.id OR email = rec.email) THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmation_token, recovery_token, email_change_token_new,
        email_change, email_change_token_current, phone_change, phone_change_token,
        reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        rec.id,
        'authenticated',
        'authenticated',
        rec.email,
        crypt(COALESCE(rec.temp_password, 'Lecturer123!'), gen_salt('bf')),
        NOW(),
        '', '', '', '', '', '', '', '',
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'lecturer', 'must_change_password', true),
        jsonb_build_object('full_name', rec.name),
        NOW(), NOW()
      );
    END IF;

    -- Ensure auth.identities exists
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      rec.id, rec.id, jsonb_build_object('sub', rec.id::text, 'email', rec.email), 'email', rec.email, NOW(), NOW(), NOW()
    ) ON CONFLICT DO NOTHING;

    -- Ensure public.users entry exists (uses whatsapp_phone and status = 'normal')
    INSERT INTO public.users (id, full_name, email, role, whatsapp_phone, faculty_id, status)
    VALUES (rec.id, rec.name, rec.email, 'lecturer', rec.phone_number, rec.faculty_id, 'normal')
    ON CONFLICT (id) DO UPDATE SET role = 'lecturer';
  END LOOP;
END;
$$;
