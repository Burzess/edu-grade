-- ====================================================================
-- EDU-GRADE DATABASE SEEDER (LOCAL DEVELOPMENT & RESET)
-- ====================================================================
-- Default Password for ALL accounts: demo123
-- Password hash generated using: crypt('demo123', gen_salt('bf'))
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ADMIN ROLE (3 Accounts)
-- --------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, is_super_admin, is_sso_user
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'admin@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "admin", "email": "admin@demo.com", "full_name": "Admin Edu-Grade"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-000000000001',
  'authenticated', 'authenticated', 'kepsek@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "11111111-1111-1111-1111-000000000001", "role": "admin", "email": "kepsek@demo.com", "full_name": "Dr. Hendrawan Pradipta, M.Ed."}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-000000000002',
  'authenticated', 'authenticated', 'akademik@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "11111111-1111-1111-1111-000000000002", "role": "admin", "email": "akademik@demo.com", "full_name": "Rina Wulandari, S.E."}',
  NOW(), NOW(), '', '', '', '', false, false
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = NOW();

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
) VALUES 
(
  '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "admin", "email": "admin@demo.com", "full_name": "Admin Edu-Grade"}',
  'email', NOW(), NOW(), NOW(), '11111111-1111-1111-1111-111111111112'
),
(
  '11111111-1111-1111-1111-000000000001', '11111111-1111-1111-1111-000000000001',
  '{"sub": "11111111-1111-1111-1111-000000000001", "role": "admin", "email": "kepsek@demo.com", "full_name": "Dr. Hendrawan Pradipta, M.Ed."}',
  'email', NOW(), NOW(), NOW(), '11111111-1111-1111-1111-000000001001'
),
(
  '11111111-1111-1111-1111-000000000002', '11111111-1111-1111-1111-000000000002',
  '{"sub": "11111111-1111-1111-1111-000000000002", "role": "admin", "email": "akademik@demo.com", "full_name": "Rina Wulandari, S.E."}',
  'email', NOW(), NOW(), NOW(), '11111111-1111-1111-1111-000000001002'
)
ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = NOW();

INSERT INTO public.profiles (id, email, full_name, role, created_at) VALUES 
('11111111-1111-1111-1111-111111111111', 'admin@demo.com', 'Admin Edu-Grade', 'admin', NOW()),
('11111111-1111-1111-1111-000000000001', 'kepsek@demo.com', 'Dr. Hendrawan Pradipta, M.Ed.', 'admin', NOW()),
('11111111-1111-1111-1111-000000000002', 'akademik@demo.com', 'Rina Wulandari, S.E.', 'admin', NOW())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role;


-- --------------------------------------------------------------------
-- 2. GURU ROLE (10 Accounts: 1 Default + 9 Random Indonesia Names)
-- --------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, is_super_admin, is_sso_user
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated', 'guru@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "guru", "email": "guru@demo.com", "full_name": "Guru Edu-Grade"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-000000000001',
  'authenticated', 'authenticated', 'budi.santoso@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-000000000001", "role": "guru", "email": "budi.santoso@demo.com", "full_name": "Drs. Budi Santoso, M.Pd."}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-000000000002',
  'authenticated', 'authenticated', 'siti.aminah@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-000000000002", "role": "guru", "email": "siti.aminah@demo.com", "full_name": "Siti Aminah, S.Pd., M.Si."}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-000000000003',
  'authenticated', 'authenticated', 'bambang.pamungkas@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-000000000003", "role": "guru", "email": "bambang.pamungkas@demo.com", "full_name": "Bambang Pamungkas, S.Kom., M.T."}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-000000000004',
  'authenticated', 'authenticated', 'dewi.sartika@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-000000000004", "role": "guru", "email": "dewi.sartika@demo.com", "full_name": "Dewi Sartika, S.Pd."}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-000000000005',
  'authenticated', 'authenticated', 'ahmad.fauzi@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-000000000005", "role": "guru", "email": "ahmad.fauzi@demo.com", "full_name": "H. Ahmad Fauzi, Lc., M.A."}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-000000000006',
  'authenticated', 'authenticated', 'ratna.wijayanti@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-000000000006", "role": "guru", "email": "ratna.wijayanti@demo.com", "full_name": "Ratna Wijayanti, S.Pd."}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-000000000007',
  'authenticated', 'authenticated', 'agus.hermawan@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-000000000007", "role": "guru", "email": "agus.hermawan@demo.com", "full_name": "Agus Hermawan, M.Kom."}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-000000000008',
  'authenticated', 'authenticated', 'sri.mulyani@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-000000000008", "role": "guru", "email": "sri.mulyani@demo.com", "full_name": "Sri Mulyani, M.Pd."}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-000000000009',
  'authenticated', 'authenticated', 'made.wirawan@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "22222222-2222-2222-2222-000000000009", "role": "guru", "email": "made.wirawan@demo.com", "full_name": "I Made Wirawan, S.Pd."}',
  NOW(), NOW(), '', '', '', '', false, false
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = NOW();

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
) VALUES 
(
  '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "guru", "email": "guru@demo.com", "full_name": "Guru Edu-Grade"}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-222222222223'
),
(
  '22222222-2222-2222-2222-000000000001', '22222222-2222-2222-2222-000000000001',
  '{"sub": "22222222-2222-2222-2222-000000000001", "role": "guru", "email": "budi.santoso@demo.com", "full_name": "Drs. Budi Santoso, M.Pd."}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-000000001001'
),
(
  '22222222-2222-2222-2222-000000000002', '22222222-2222-2222-2222-000000000002',
  '{"sub": "22222222-2222-2222-2222-000000000002", "role": "guru", "email": "siti.aminah@demo.com", "full_name": "Siti Aminah, S.Pd., M.Si."}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-000000001002'
),
(
  '22222222-2222-2222-2222-000000000003', '22222222-2222-2222-2222-000000000003',
  '{"sub": "22222222-2222-2222-2222-000000000003", "role": "guru", "email": "bambang.pamungkas@demo.com", "full_name": "Bambang Pamungkas, S.Kom., M.T."}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-000000001003'
),
(
  '22222222-2222-2222-2222-000000000004', '22222222-2222-2222-2222-000000000004',
  '{"sub": "22222222-2222-2222-2222-000000000004", "role": "guru", "email": "dewi.sartika@demo.com", "full_name": "Dewi Sartika, S.Pd."}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-000000001004'
),
(
  '22222222-2222-2222-2222-000000000005', '22222222-2222-2222-2222-000000000005',
  '{"sub": "22222222-2222-2222-2222-000000000005", "role": "guru", "email": "ahmad.fauzi@demo.com", "full_name": "H. Ahmad Fauzi, Lc., M.A."}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-000000001005'
),
(
  '22222222-2222-2222-2222-000000000006', '22222222-2222-2222-2222-000000000006',
  '{"sub": "22222222-2222-2222-2222-000000000006", "role": "guru", "email": "ratna.wijayanti@demo.com", "full_name": "Ratna Wijayanti, S.Pd."}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-000000001006'
),
(
  '22222222-2222-2222-2222-000000000007', '22222222-2222-2222-2222-000000000007',
  '{"sub": "22222222-2222-2222-2222-000000000007", "role": "guru", "email": "agus.hermawan@demo.com", "full_name": "Agus Hermawan, M.Kom."}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-000000001007'
),
(
  '22222222-2222-2222-2222-000000000008', '22222222-2222-2222-2222-000000000008',
  '{"sub": "22222222-2222-2222-2222-000000000008", "role": "guru", "email": "sri.mulyani@demo.com", "full_name": "Sri Mulyani, M.Pd."}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-000000001008'
),
(
  '22222222-2222-2222-2222-000000000009', '22222222-2222-2222-2222-000000000009',
  '{"sub": "22222222-2222-2222-2222-000000000009", "role": "guru", "email": "made.wirawan@demo.com", "full_name": "I Made Wirawan, S.Pd."}',
  'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-000000001009'
)
ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = NOW();

INSERT INTO public.profiles (id, email, full_name, role, created_at) VALUES 
('22222222-2222-2222-2222-222222222222', 'guru@demo.com', 'Guru Edu-Grade', 'guru', NOW()),
('22222222-2222-2222-2222-000000000001', 'budi.santoso@demo.com', 'Drs. Budi Santoso, M.Pd.', 'guru', NOW()),
('22222222-2222-2222-2222-000000000002', 'siti.aminah@demo.com', 'Siti Aminah, S.Pd., M.Si.', 'guru', NOW()),
('22222222-2222-2222-2222-000000000003', 'bambang.pamungkas@demo.com', 'Bambang Pamungkas, S.Kom., M.T.', 'guru', NOW()),
('22222222-2222-2222-2222-000000000004', 'dewi.sartika@demo.com', 'Dewi Sartika, S.Pd.', 'guru', NOW()),
('22222222-2222-2222-2222-000000000005', 'ahmad.fauzi@demo.com', 'H. Ahmad Fauzi, Lc., M.A.', 'guru', NOW()),
('22222222-2222-2222-2222-000000000006', 'ratna.wijayanti@demo.com', 'Ratna Wijayanti, S.Pd.', 'guru', NOW()),
('22222222-2222-2222-2222-000000000007', 'agus.hermawan@demo.com', 'Agus Hermawan, M.Kom.', 'guru', NOW()),
('22222222-2222-2222-2222-000000000008', 'sri.mulyani@demo.com', 'Sri Mulyani, M.Pd.', 'guru', NOW()),
('22222222-2222-2222-2222-000000000009', 'made.wirawan@demo.com', 'I Made Wirawan, S.Pd.', 'guru', NOW())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role;


-- --------------------------------------------------------------------
-- 3. SISWA ROLE (21 Accounts: 1 Default + 20 Random Indonesia Names)
-- --------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, is_super_admin, is_sso_user
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated', 'authenticated', 'siswa@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-333333333333", "role": "siswa", "email": "siswa@demo.com", "full_name": "Siswa Edu-Grade"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000001',
  'authenticated', 'authenticated', 'rizky.pratama@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000001", "role": "siswa", "email": "rizky.pratama@demo.com", "full_name": "Rizky Pratama"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000002',
  'authenticated', 'authenticated', 'putri.anjani@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000002", "role": "siswa", "email": "putri.anjani@demo.com", "full_name": "Putri Anjani"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000003',
  'authenticated', 'authenticated', 'dimas.setiawan@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000003", "role": "siswa", "email": "dimas.setiawan@demo.com", "full_name": "Dimas Setiawan"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000004',
  'authenticated', 'authenticated', 'nisa.fitriani@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000004", "role": "siswa", "email": "nisa.fitriani@demo.com", "full_name": "Nisa Fitriani"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000005',
  'authenticated', 'authenticated', 'adi.nugroho@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000005", "role": "siswa", "email": "adi.nugroho@demo.com", "full_name": "Adi Nugroho"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000006',
  'authenticated', 'authenticated', 'aulia.rahmawati@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000006", "role": "siswa", "email": "aulia.rahmawati@demo.com", "full_name": "Aulia Rahmawati"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000007',
  'authenticated', 'authenticated', 'fajar.ramadhan@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000007", "role": "siswa", "email": "fajar.ramadhan@demo.com", "full_name": "Fajar Ramadhan"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000008',
  'authenticated', 'authenticated', 'melani.putri@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000008", "role": "siswa", "email": "melani.putri@demo.com", "full_name": "Melani Putri"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000009',
  'authenticated', 'authenticated', 'bayu.saputra@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000009", "role": "siswa", "email": "bayu.saputra@demo.com", "full_name": "Bayu Saputra"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000010',
  'authenticated', 'authenticated', 'siti.nurhaliza@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000010", "role": "siswa", "email": "siti.nurhaliza@demo.com", "full_name": "Siti Nurhaliza"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000011',
  'authenticated', 'authenticated', 'eka.praja@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000011", "role": "siswa", "email": "eka.praja@demo.com", "full_name": "Eka Praja Wibowo"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000012',
  'authenticated', 'authenticated', 'tania.lestari@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000012", "role": "siswa", "email": "tania.lestari@demo.com", "full_name": "Tania Lestari"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000013',
  'authenticated', 'authenticated', 'reza.oktavian@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000013", "role": "siswa", "email": "reza.oktavian@demo.com", "full_name": "Reza Oktavian"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000014',
  'authenticated', 'authenticated', 'lesti.andryani@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000014", "role": "siswa", "email": "lesti.andryani@demo.com", "full_name": "Lesti Andryani"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000015',
  'authenticated', 'authenticated', 'hendra.gunawan@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000015", "role": "siswa", "email": "hendra.gunawan@demo.com", "full_name": "Hendra Gunawan"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000016',
  'authenticated', 'authenticated', 'gitaputri.maharani@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000016", "role": "siswa", "email": "gitaputri.maharani@demo.com", "full_name": "Gita Putri Maharani"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000017',
  'authenticated', 'authenticated', 'yohanes.setiawan@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000017", "role": "siswa", "email": "yohanes.setiawan@demo.com", "full_name": "Yohanes Setiawan"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000018',
  'authenticated', 'authenticated', 'zahra.amalia@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000018", "role": "siswa", "email": "zahra.amalia@demo.com", "full_name": "Zahra Amalia"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000019',
  'authenticated', 'authenticated', 'muhammad.ilham@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000019", "role": "siswa", "email": "muhammad.ilham@demo.com", "full_name": "Muhammad Ilham"}',
  NOW(), NOW(), '', '', '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-000000000020',
  'authenticated', 'authenticated', 'annisa.pratiwi@demo.com',
  crypt('demo123', gen_salt('bf')), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "33333333-3333-3333-3333-000000000020", "role": "siswa", "email": "annisa.pratiwi@demo.com", "full_name": "Annisa Pratiwi"}',
  NOW(), NOW(), '', '', '', '', false, false
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = NOW();

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
) VALUES 
(
  '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
  '{"sub": "33333333-3333-3333-3333-333333333333", "role": "siswa", "email": "siswa@demo.com", "full_name": "Siswa Edu-Grade"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-333333333334'
),
(
  '33333333-3333-3333-3333-000000000001', '33333333-3333-3333-3333-000000000001',
  '{"sub": "33333333-3333-3333-3333-000000000001", "role": "siswa", "email": "rizky.pratama@demo.com", "full_name": "Rizky Pratama"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002001'
),
(
  '33333333-3333-3333-3333-000000000002', '33333333-3333-3333-3333-000000000002',
  '{"sub": "33333333-3333-3333-3333-000000000002", "role": "siswa", "email": "putri.anjani@demo.com", "full_name": "Putri Anjani"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002002'
),
(
  '33333333-3333-3333-3333-000000000003', '33333333-3333-3333-3333-000000000003',
  '{"sub": "33333333-3333-3333-3333-000000000003", "role": "siswa", "email": "dimas.setiawan@demo.com", "full_name": "Dimas Setiawan"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002003'
),
(
  '33333333-3333-3333-3333-000000000004', '33333333-3333-3333-3333-000000000004',
  '{"sub": "33333333-3333-3333-3333-000000000004", "role": "siswa", "email": "nisa.fitriani@demo.com", "full_name": "Nisa Fitriani"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002004'
),
(
  '33333333-3333-3333-3333-000000000005', '33333333-3333-3333-3333-000000000005',
  '{"sub": "33333333-3333-3333-3333-000000000005", "role": "siswa", "email": "adi.nugroho@demo.com", "full_name": "Adi Nugroho"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002005'
),
(
  '33333333-3333-3333-3333-000000000006', '33333333-3333-3333-3333-000000000006',
  '{"sub": "33333333-3333-3333-3333-000000000006", "role": "siswa", "email": "aulia.rahmawati@demo.com", "full_name": "Aulia Rahmawati"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002006'
),
(
  '33333333-3333-3333-3333-000000000007', '33333333-3333-3333-3333-000000000007',
  '{"sub": "33333333-3333-3333-3333-000000000007", "role": "siswa", "email": "fajar.ramadhan@demo.com", "full_name": "Fajar Ramadhan"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002007'
),
(
  '33333333-3333-3333-3333-000000000008', '33333333-3333-3333-3333-000000000008',
  '{"sub": "33333333-3333-3333-3333-000000000008", "role": "siswa", "email": "melani.putri@demo.com", "full_name": "Melani Putri"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002008'
),
(
  '33333333-3333-3333-3333-000000000009', '33333333-3333-3333-3333-000000000009',
  '{"sub": "33333333-3333-3333-3333-000000000009", "role": "siswa", "email": "bayu.saputra@demo.com", "full_name": "Bayu Saputra"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002009'
),
(
  '33333333-3333-3333-3333-000000000010', '33333333-3333-3333-3333-000000000010',
  '{"sub": "33333333-3333-3333-3333-000000000010", "role": "siswa", "email": "siti.nurhaliza@demo.com", "full_name": "Siti Nurhaliza"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002010'
),
(
  '33333333-3333-3333-3333-000000000011', '33333333-3333-3333-3333-000000000011',
  '{"sub": "33333333-3333-3333-3333-000000000011", "role": "siswa", "email": "eka.praja@demo.com", "full_name": "Eka Praja Wibowo"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002011'
),
(
  '33333333-3333-3333-3333-000000000012', '33333333-3333-3333-3333-000000000012',
  '{"sub": "33333333-3333-3333-3333-000000000012", "role": "siswa", "email": "tania.lestari@demo.com", "full_name": "Tania Lestari"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002012'
),
(
  '33333333-3333-3333-3333-000000000013', '33333333-3333-3333-3333-000000000013',
  '{"sub": "33333333-3333-3333-3333-000000000013", "role": "siswa", "email": "reza.oktavian@demo.com", "full_name": "Reza Oktavian"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002013'
),
(
  '33333333-3333-3333-3333-000000000014', '33333333-3333-3333-3333-000000000014',
  '{"sub": "33333333-3333-3333-3333-000000000014", "role": "siswa", "email": "lesti.andryani@demo.com", "full_name": "Lesti Andryani"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002014'
),
(
  '33333333-3333-3333-3333-000000000015', '33333333-3333-3333-3333-000000000015',
  '{"sub": "33333333-3333-3333-3333-000000000015", "role": "siswa", "email": "hendra.gunawan@demo.com", "full_name": "Hendra Gunawan"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002015'
),
(
  '33333333-3333-3333-3333-000000000016', '33333333-3333-3333-3333-000000000016',
  '{"sub": "33333333-3333-3333-3333-000000000016", "role": "siswa", "email": "gitaputri.maharani@demo.com", "full_name": "Gita Putri Maharani"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002016'
),
(
  '33333333-3333-3333-3333-000000000017', '33333333-3333-3333-3333-000000000017',
  '{"sub": "33333333-3333-3333-3333-000000000017", "role": "siswa", "email": "yohanes.setiawan@demo.com", "full_name": "Yohanes Setiawan"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002017'
),
(
  '33333333-3333-3333-3333-000000000018', '33333333-3333-3333-3333-000000000018',
  '{"sub": "33333333-3333-3333-3333-000000000018", "role": "siswa", "email": "zahra.amalia@demo.com", "full_name": "Zahra Amalia"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002018'
),
(
  '33333333-3333-3333-3333-000000000019', '33333333-3333-3333-3333-000000000019',
  '{"sub": "33333333-3333-3333-3333-000000000019", "role": "siswa", "email": "muhammad.ilham@demo.com", "full_name": "Muhammad Ilham"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002019'
),
(
  '33333333-3333-3333-3333-000000000020', '33333333-3333-3333-3333-000000000020',
  '{"sub": "33333333-3333-3333-3333-000000000020", "role": "siswa", "email": "annisa.pratiwi@demo.com", "full_name": "Annisa Pratiwi"}',
  'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-000000002020'
)
ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = NOW();

INSERT INTO public.profiles (id, email, full_name, role, created_at) VALUES 
('33333333-3333-3333-3333-333333333333', 'siswa@demo.com', 'Siswa Edu-Grade', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000001', 'rizky.pratama@demo.com', 'Rizky Pratama', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000002', 'putri.anjani@demo.com', 'Putri Anjani', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000003', 'dimas.setiawan@demo.com', 'Dimas Setiawan', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000004', 'nisa.fitriani@demo.com', 'Nisa Fitriani', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000005', 'adi.nugroho@demo.com', 'Adi Nugroho', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000006', 'aulia.rahmawati@demo.com', 'Aulia Rahmawati', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000007', 'fajar.ramadhan@demo.com', 'Fajar Ramadhan', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000008', 'melani.putri@demo.com', 'Melani Putri', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000009', 'bayu.saputra@demo.com', 'Bayu Saputra', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000010', 'siti.nurhaliza@demo.com', 'Siti Nurhaliza', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000011', 'eka.praja@demo.com', 'Eka Praja Wibowo', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000012', 'tania.lestari@demo.com', 'Tania Lestari', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000013', 'reza.oktavian@demo.com', 'Reza Oktavian', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000014', 'lesti.andryani@demo.com', 'Lesti Andryani', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000015', 'hendra.gunawan@demo.com', 'Hendra Gunawan', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000016', 'gitaputri.maharani@demo.com', 'Gita Putri Maharani', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000017', 'yohanes.setiawan@demo.com', 'Yohanes Setiawan', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000018', 'zahra.amalia@demo.com', 'Zahra Amalia', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000019', 'muhammad.ilham@demo.com', 'Muhammad Ilham', 'siswa', NOW()),
('33333333-3333-3333-3333-000000000020', 'annisa.pratiwi@demo.com', 'Annisa Pratiwi', 'siswa', NOW())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role;


-- --------------------------------------------------------------------
-- 4. SAMPLE CLASSES (KELAS)
-- --------------------------------------------------------------------
INSERT INTO public.kelas (id, nama_kelas, deskripsi, kode_kelas, created_by, guru_id, is_active, created_at, updated_at) VALUES
('44444444-4444-4444-4444-000000000001', 'Matematika Lanjut - Kelas 10-A', 'Pembelajaran Aljabar, Fungsi, dan Trigonometri untuk Kelas 10-A', 'MAT-10A-2026', '22222222-2222-2222-2222-000000000001', '22222222-2222-2222-2222-000000000001', true, NOW(), NOW()),
('44444444-4444-4444-4444-000000000002', 'Fisika Dasar - Kelas 10-A', 'Konsep Mekanika, Dinamika Partikel, dan Hukum Newton', 'FIS-10A-2026', '22222222-2222-2222-2222-000000000002', '22222222-2222-2222-2222-000000000002', true, NOW(), NOW()),
('44444444-4444-4444-4444-000000000003', 'Informatika & Algoritma - Kelas 11-B', 'Logika Pemrograman, Algoritma Dasar, dan Python Programming', 'INF-11B-2026', '22222222-2222-2222-2222-000000000003', '22222222-2222-2222-2222-000000000003', true, NOW(), NOW()),
('44444444-4444-4444-4444-000000000004', 'Bahasa Indonesia - Kelas 12-A', 'Keterampilan Menulis Karya Ilmiah, Apresiasi Sastra & Jurnalistik', 'BIN-12A-2026', '22222222-2222-2222-2222-000000000004', '22222222-2222-2222-2222-000000000004', true, NOW(), NOW()),
('44444444-4444-4444-4444-000000000005', 'Bahasa Inggris & Conversation - Kelas 10-B', 'English Grammar, Reading Comprehension & Interactive Speaking', 'ING-10B-2026', '22222222-2222-2222-2222-000000000009', '22222222-2222-2222-2222-000000000009', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  nama_kelas = EXCLUDED.nama_kelas,
  deskripsi = EXCLUDED.deskripsi,
  kode_kelas = EXCLUDED.kode_kelas,
  created_by = EXCLUDED.created_by,
  guru_id = EXCLUDED.guru_id,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();


-- --------------------------------------------------------------------
-- 5. CLASS MEMBERSHIPS (KELAS_MEMBERS)
-- --------------------------------------------------------------------
INSERT INTO public.kelas_members (id, kelas_id, siswa_id, joined_at) VALUES
-- Matematika Lanjut (4444...1)
('55555555-5555-5555-5555-000000000001', '44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-333333333333', NOW()),
('55555555-5555-5555-5555-000000000002', '44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000001', NOW()),
('55555555-5555-5555-5555-000000000003', '44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000002', NOW()),
('55555555-5555-5555-5555-000000000004', '44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000003', NOW()),
('55555555-5555-5555-5555-000000000005', '44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000004', NOW()),
('55555555-5555-5555-5555-000000000006', '44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000005', NOW()),

-- Fisika Dasar (4444...2)
('55555555-5555-5555-5555-000000000007', '44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-333333333333', NOW()),
('55555555-5555-5555-5555-000000000008', '44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000001', NOW()),
('55555555-5555-5555-5555-000000000009', '44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000006', NOW()),
('55555555-5555-5555-5555-000000000010', '44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000007', NOW()),
('55555555-5555-5555-5555-000000000011', '44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000008', NOW()),

-- Informatika & Algoritma (4444...3)
('55555555-5555-5555-5555-000000000012', '44444444-4444-4444-4444-000000000003', '33333333-3333-3333-3333-000000000009', NOW()),
('55555555-5555-5555-5555-000000000013', '44444444-4444-4444-4444-000000000003', '33333333-3333-3333-3333-000000000010', NOW()),
('55555555-5555-5555-5555-000000000014', '44444444-4444-4444-4444-000000000003', '33333333-3333-3333-3333-000000000011', NOW()),
('55555555-5555-5555-5555-000000000015', '44444444-4444-4444-4444-000000000003', '33333333-3333-3333-3333-000000000012', NOW()),
('55555555-5555-5555-5555-000000000016', '44444444-4444-4444-4444-000000000003', '33333333-3333-3333-3333-000000000013', NOW()),

-- Bahasa Indonesia (4444...4)
('55555555-5555-5555-5555-000000000017', '44444444-4444-4444-4444-000000000004', '33333333-3333-3333-3333-000000000014', NOW()),
('55555555-5555-5555-5555-000000000018', '44444444-4444-4444-4444-000000000004', '33333333-3333-3333-3333-000000000015', NOW()),
('55555555-5555-5555-5555-000000000019', '44444444-4444-4444-4444-000000000004', '33333333-3333-3333-3333-000000000016', NOW()),
('55555555-5555-5555-5555-000000000020', '44444444-4444-4444-4444-000000000004', '33333333-3333-3333-3333-000000000017', NOW()),

-- Bahasa Inggris & Conversation (4444...5)
('55555555-5555-5555-5555-000000000021', '44444444-4444-4444-4444-000000000005', '33333333-3333-3333-3333-000000000018', NOW()),
('55555555-5555-5555-5555-000000000022', '44444444-4444-4444-4444-000000000005', '33333333-3333-3333-3333-000000000019', NOW()),
('55555555-5555-5555-5555-000000000023', '44444444-4444-4444-4444-000000000005', '33333333-3333-3333-3333-000000000020', NOW()),
('55555555-5555-5555-5555-000000000024', '44444444-4444-4444-4444-000000000005', '33333333-3333-3333-3333-000000000001', NOW()),
('55555555-5555-5555-5555-000000000025', '44444444-4444-4444-4444-000000000005', '33333333-3333-3333-3333-000000000002', NOW())
ON CONFLICT (id) DO UPDATE SET
  kelas_id = EXCLUDED.kelas_id,
  siswa_id = EXCLUDED.siswa_id,
  joined_at = NOW();
