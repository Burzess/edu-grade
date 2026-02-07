-- Migration untuk sistem survei penelitian prototyping
-- Created: 2025-10-20

-- Tabel utama survei
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  iteration INTEGER DEFAULT 1, -- untuk tracking iterasi prototyping
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Tabel pertanyaan survei
CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('likert', 'multiple_choice', 'text', 'rating')),
  options JSONB, -- untuk menyimpan options multiple choice
  category VARCHAR(50) NOT NULL CHECK (category IN ('usability', 'functionality', 'design', 'satisfaction', 'general')),
  order_number INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel respons survei
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE,
  answer_value VARCHAR(255), -- untuk likert, rating, multiple choice
  answer_text TEXT, -- untuk text responses
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(survey_id, user_id, question_id) -- satu user hanya bisa jawab sekali per pertanyaan
);

-- Tabel untuk tracking siapa saja yang sudah mengisi survei
CREATE TABLE IF NOT EXISTS survey_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(survey_id, user_id)
);

-- Index untuk performa
CREATE INDEX idx_survey_questions_survey_id ON survey_questions(survey_id);
CREATE INDEX idx_survey_questions_order ON survey_questions(survey_id, order_number);
CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_user_id ON survey_responses(user_id);
CREATE INDEX idx_survey_responses_question_id ON survey_responses(question_id);
CREATE INDEX idx_survey_participants_survey_id ON survey_participants(survey_id);
CREATE INDEX idx_survey_participants_user_id ON survey_participants(user_id);

-- RLS Policies

-- Surveys: Semua user bisa lihat survei yang aktif
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active surveys"
  ON surveys FOR SELECT
  USING (is_active = true);

-- Guru dapat mengelola survei (sebagai pengganti admin karena tidak ada role admin)
CREATE POLICY "Guru can manage surveys"
  ON surveys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'guru'
    )
  );

-- Survey Questions: Semua user bisa lihat pertanyaan dari survei aktif
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view questions from active surveys"
  ON survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.is_active = true
    )
  );

-- Guru dapat mengelola pertanyaan survei
CREATE POLICY "Guru can manage questions"
  ON survey_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'guru'
    )
  );

-- Survey Responses: User bisa insert jawaban sendiri dan admin bisa lihat semua
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own responses"
  ON survey_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own responses"
  ON survey_responses FOR SELECT
  USING (auth.uid() = user_id);

-- Guru dapat melihat semua respons survei
CREATE POLICY "Guru can view all responses"
  ON survey_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'guru'
    )
  );

-- Survey Participants
ALTER TABLE survey_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own participation"
  ON survey_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own participation"
  ON survey_participants FOR SELECT
  USING (auth.uid() = user_id);

-- Guru dapat melihat semua partisipan survei
CREATE POLICY "Guru can view all participants"
  ON survey_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'guru'
    )
  );

-- Function untuk update updated_at
CREATE OR REPLACE FUNCTION update_survey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_updated_at_trigger
  BEFORE UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_updated_at();
