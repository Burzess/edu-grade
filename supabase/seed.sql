-- Default seeder for local development / reset
-- Password for all accounts: demo123

-- 1. ADMIN
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, is_super_admin, is_sso_user
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'admin@demo.com',
  crypt('demo123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "admin", "email": "admin@demo.com", "full_name": "Admin Edu-Grade"}',
  NOW(),
  NOW(),
  '', '', '', '', false, false
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = NOW();

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
) VALUES (
  '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "admin", "email": "admin@demo.com", "full_name": "Admin Edu-Grade"}',
  'email', NOW(), NOW(), NOW(),
  '11111111-1111-1111-1111-111111111112'
) ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = NOW();

INSERT INTO public.profiles (id, email, full_name, role, created_at) VALUES (
  '11111111-1111-1111-1111-111111111111', 'admin@demo.com', 'Admin Edu-Grade', 'admin', NOW()
) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role;


-- 2. GURU
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, is_super_admin, is_sso_user
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'guru@demo.com',
  crypt('demo123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "guru", "email": "guru@demo.com", "full_name": "Guru Edu-Grade"}',
  NOW(),
  NOW(),
  '', '', '', '', false, false
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = NOW();

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
) VALUES (
  '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "guru", "email": "guru@demo.com", "full_name": "Guru Edu-Grade"}',
  'email', NOW(), NOW(), NOW(),
  '22222222-2222-2222-2222-222222222223'
) ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = NOW();

INSERT INTO public.profiles (id, email, full_name, role, created_at) VALUES (
  '22222222-2222-2222-2222-222222222222', 'guru@demo.com', 'Guru Edu-Grade', 'guru', NOW()
) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role;


-- 3. SISWA
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, is_super_admin, is_sso_user
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'siswa@demo.com',
  crypt('demo123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-333333333333", "role": "siswa", "email": "siswa@demo.com", "full_name": "Siswa Edu-Grade"}',
  NOW(),
  NOW(),
  '', '', '', '', false, false
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = NOW();

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
) VALUES (
  '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
  '{"sub": "33333333-3333-3333-3333-333333333333", "role": "siswa", "email": "siswa@demo.com", "full_name": "Siswa Edu-Grade"}',
  'email', NOW(), NOW(), NOW(),
  '33333333-3333-3333-3333-333333333334'
) ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = NOW();

INSERT INTO public.profiles (id, email, full_name, role, created_at) VALUES (
  '33333333-3333-3333-3333-333333333333', 'siswa@demo.com', 'Siswa Edu-Grade', 'siswa', NOW()
) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role;
