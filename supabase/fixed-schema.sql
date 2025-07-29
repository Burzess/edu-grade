-- Fixed Database Schema untuk Edu-Grade
-- Jalankan script ini di Supabase SQL Editor

-- Step 1: Create enum dengan check exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('siswa', 'guru');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create profiles table dengan error handling
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'siswa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 3: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (jika ada) dan buat ulang
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON profiles;

-- Step 5: Create safe RLS policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy khusus untuk service role (untuk trigger)
CREATE POLICY "Enable insert for service role" ON profiles
  FOR INSERT WITH CHECK (true);

-- Step 6: Create safe function untuk handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert dengan error handling
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'siswa')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error tapi jangan fail signup
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO anon, authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon, authenticated;

-- Step 9: Create remaining tables (untuk phase selanjutnya)
CREATE TABLE IF NOT EXISTS soal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  tags TEXT[],
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE soal ENABLE ROW LEVEL SECURITY;

-- RLS untuk soal
DROP POLICY IF EXISTS "Guru can manage own soal" ON soal;
CREATE POLICY "Guru can manage own soal" ON soal
  FOR ALL USING (
    auth.uid() = created_by AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
  );

-- Step 10: Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_soal_created_by ON soal(created_by);

-- Step 11: Test function (optional - untuk debug)
CREATE OR REPLACE FUNCTION test_profile_creation(
  test_user_id UUID,
  test_email TEXT,
  test_full_name TEXT DEFAULT 'Test User',
  test_role TEXT DEFAULT 'siswa'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (test_user_id, test_email, test_full_name, test_role::user_role);
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RETURN FALSE;
END;
$$;
