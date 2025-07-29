-- Phase 2: CRUD Soal Schema
-- Tambahkan ini ke existing schema atau jalankan terpisah

-- Update soal table dengan struktur yang lebih lengkap
DROP TABLE IF EXISTS soal CASCADE;

CREATE TABLE soal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) DEFAULT 'essay' CHECK (question_type IN ('essay', 'multiple_choice')),
  tags TEXT[] DEFAULT '{}',
  difficulty_level VARCHAR(10) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE soal ENABLE ROW LEVEL SECURITY;

-- Drop existing policies jika ada
DROP POLICY IF EXISTS "Guru can manage own soal" ON soal;
DROP POLICY IF EXISTS "Guru can view own soal" ON soal;
DROP POLICY IF EXISTS "Guru can insert soal" ON soal;
DROP POLICY IF EXISTS "Guru can update own soal" ON soal;
DROP POLICY IF EXISTS "Guru can delete own soal" ON soal;

-- RLS policies untuk soal - hanya guru yang bisa manage soal mereka sendiri
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
  ) WITH CHECK (
    auth.uid() = created_by AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
  );

CREATE POLICY "Guru can delete own soal" ON soal
  FOR DELETE USING (
    auth.uid() = created_by AND 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
  );

-- Create indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_soal_created_by ON soal(created_by);
CREATE INDEX IF NOT EXISTS idx_soal_tags ON soal USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_soal_type ON soal(question_type);
CREATE INDEX IF NOT EXISTS idx_soal_difficulty ON soal(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_soal_created_at ON soal(created_at DESC);

-- Function untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger untuk auto-update updated_at
CREATE TRIGGER update_soal_updated_at 
    BEFORE UPDATE ON soal 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON TABLE soal TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
