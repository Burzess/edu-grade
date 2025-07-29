-- Tambah kolom untuk pilihan ganda
ALTER TABLE soal 
ADD COLUMN options JSONB DEFAULT NULL,
ADD COLUMN correct_answer TEXT DEFAULT NULL;

-- Comment untuk dokumentasi
COMMENT ON COLUMN soal.options IS 'Array of options for multiple choice questions, format: [{"id": "A", "text": "Option A"}, {"id": "B", "text": "Option B"}]';
COMMENT ON COLUMN soal.correct_answer IS 'ID of correct answer for multiple choice (A, B, C, D) or null for essay questions';

-- Update RLS policy untuk include kolom baru
DROP POLICY IF EXISTS "Users can view their own soal" ON soal;
CREATE POLICY "Users can view their own soal" ON soal
    FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can insert their own soal" ON soal;
CREATE POLICY "Users can insert their own soal" ON soal
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own soal" ON soal;
CREATE POLICY "Users can update their own soal" ON soal
    FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own soal" ON soal;
CREATE POLICY "Users can delete their own soal" ON soal
    FOR DELETE USING (auth.uid() = created_by);
