-- Create jawaban table for student answers
CREATE TABLE IF NOT EXISTS public.jawaban (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ujian_id UUID NOT NULL REFERENCES public.ujian(id) ON DELETE CASCADE,
    soal_id UUID NOT NULL REFERENCES public.soal(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    score INTEGER,
    ai_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one answer per student per question in an exam
    UNIQUE(ujian_id, soal_id, siswa_id)
);

-- Create RLS policies for jawaban table
ALTER TABLE public.jawaban ENABLE ROW LEVEL SECURITY;

-- Students can only see and manage their own answers
CREATE POLICY "Students can view their own answers" ON public.jawaban
    FOR SELECT USING (auth.uid() = siswa_id);

CREATE POLICY "Students can insert their own answers" ON public.jawaban
    FOR INSERT WITH CHECK (auth.uid() = siswa_id);

CREATE POLICY "Students can update their own answers" ON public.jawaban
    FOR UPDATE USING (auth.uid() = siswa_id) WITH CHECK (auth.uid() = siswa_id);

-- Teachers can view answers for their exams
CREATE POLICY "Teachers can view answers for their exams" ON public.jawaban
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ujian
            WHERE ujian.id = jawaban.ujian_id 
            AND ujian.created_by = auth.uid()
        )
    );

-- Teachers can update scores and feedback for their exams
CREATE POLICY "Teachers can update scores for their exams" ON public.jawaban
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.ujian
            WHERE ujian.id = jawaban.ujian_id 
            AND ujian.created_by = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_jawaban_ujian_id ON public.jawaban(ujian_id);
CREATE INDEX idx_jawaban_siswa_id ON public.jawaban(siswa_id);
CREATE INDEX idx_jawaban_soal_id ON public.jawaban(soal_id);

-- Create trigger for updated_at
CREATE TRIGGER set_jawaban_updated_at 
    BEFORE UPDATE ON public.jawaban 
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
