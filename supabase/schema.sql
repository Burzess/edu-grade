-- Enable Row Level Security (RLS)
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('siswa', 'guru');

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert profile" ON profiles
    FOR INSERT WITH CHECK (TRUE);

-- Create soal (questions) table
CREATE TABLE soal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  tags TEXT[],
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on soal
ALTER TABLE soal ENABLE ROW LEVEL SECURITY;

-- RLS policies for soal - only guru can manage their own questions
CREATE POLICY "Guru can view own soal" ON soal
  FOR SELECT USING (
    auth.uid() = created_by AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
  );

CREATE POLICY "Guru can insert soal" ON soal
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
  );

CREATE POLICY "Guru can update own soal" ON soal
  FOR UPDATE USING (
    auth.uid() = created_by AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
  );

CREATE POLICY "Guru can delete own soal" ON soal
  FOR DELETE USING (
    auth.uid() = created_by AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
  );

-- Create ujian (exams) table
CREATE TABLE ujian (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT valid_exam_time CHECK (start_time < end_time)
);

-- Enable RLS on ujian
ALTER TABLE ujian ENABLE ROW LEVEL SECURITY;

-- RLS policies for ujian
CREATE POLICY "Guru can manage own ujian" ON ujian
  FOR ALL USING (
    auth.uid() = created_by AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
  );

-- Siswa can view ujian that are currently active
CREATE POLICY "Siswa can view active ujian" ON ujian
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siswa') AND
    NOW() >= start_time AND NOW() <= end_time
  );

-- Create ujian_soal (exam questions) join table
CREATE TABLE ujian_soal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ujian_id UUID REFERENCES ujian(id) ON DELETE CASCADE NOT NULL,
  soal_id UUID REFERENCES soal(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(ujian_id, soal_id)
);

-- Enable RLS on ujian_soal
ALTER TABLE ujian_soal ENABLE ROW LEVEL SECURITY;

-- RLS policies for ujian_soal
CREATE POLICY "Guru can manage ujian_soal for own ujian" ON ujian_soal
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM ujian 
      WHERE id = ujian_id 
      AND created_by = auth.uid()
      AND EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
    )
  );

-- Siswa can view ujian_soal for active ujian
CREATE POLICY "Siswa can view ujian_soal for active ujian" ON ujian_soal
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM ujian 
      WHERE id = ujian_id 
      AND NOW() >= start_time 
      AND NOW() <= end_time
      AND EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siswa')
    )
  );

-- Create jawaban (answers) table
CREATE TABLE jawaban (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ujian_id UUID REFERENCES ujian(id) ON DELETE CASCADE NOT NULL,
  soal_id UUID REFERENCES soal(id) ON DELETE CASCADE NOT NULL,
  siswa_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  score NUMERIC(5,2),
  ai_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(ujian_id, soal_id, siswa_id)
);

-- Enable RLS on jawaban
ALTER TABLE jawaban ENABLE ROW LEVEL SECURITY;

-- RLS policies for jawaban
-- Siswa can only insert and view their own answers
CREATE POLICY "Siswa can insert own jawaban" ON jawaban
  FOR INSERT WITH CHECK (
    auth.uid() = siswa_id AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siswa') AND
    EXISTS(
      SELECT 1 FROM ujian 
      WHERE id = ujian_id 
      AND NOW() >= start_time 
      AND NOW() <= end_time
    )
  );

CREATE POLICY "Siswa can view own jawaban" ON jawaban
  FOR SELECT USING (
    auth.uid() = siswa_id AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siswa')
  );

-- Guru can view jawaban for their ujian
CREATE POLICY "Guru can view jawaban for own ujian" ON jawaban
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM ujian 
      WHERE id = ujian_id 
      AND created_by = auth.uid()
      AND EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
    )
  );

-- Guru can update scores and feedback for their ujian
CREATE POLICY "Guru can update jawaban for own ujian" ON jawaban
  FOR UPDATE USING (
    EXISTS(
      SELECT 1 FROM ujian 
      WHERE id = ujian_id 
      AND created_by = auth.uid()
      AND EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_soal_created_by ON soal(created_by);
CREATE INDEX idx_soal_tags ON soal USING GIN(tags);
CREATE INDEX idx_ujian_created_by ON ujian(created_by);
CREATE INDEX idx_ujian_time ON ujian(start_time, end_time);
CREATE INDEX idx_ujian_soal_ujian_id ON ujian_soal(ujian_id);
CREATE INDEX idx_ujian_soal_soal_id ON ujian_soal(soal_id);
CREATE INDEX idx_jawaban_ujian_id ON jawaban(ujian_id);
CREATE INDEX idx_jawaban_siswa_id ON jawaban(siswa_id);
CREATE INDEX idx_jawaban_soal_id ON jawaban(soal_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'siswa')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
