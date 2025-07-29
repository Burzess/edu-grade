-- Script untuk debug dan fix database issues

-- 1. Cek apakah table profiles sudah ada
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Cek apakah enum user_role sudah ada
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'user_role';

-- 3. Cek apakah trigger function ada
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 4. Cek apakah trigger ada
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' AND event_object_table = 'users';

-- 5. Cek RLS policies untuk profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Cek apakah RLS enabled di table profiles
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 7. Test insert manual ke profiles (untuk debug)
-- INSERT INTO profiles (id, email, full_name, role) 
-- VALUES ('test-uuid', 'test@test.com', 'Test User', 'siswa');

-- 8. Cek data yang ada di profiles
SELECT id, email, full_name, role, created_at 
FROM profiles 
LIMIT 5;
