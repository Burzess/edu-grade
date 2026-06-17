-- Migration: Multiple Target Kelas for Ujian

-- 1. Create junction table
CREATE TABLE public.ujian_kelas (
    ujian_id UUID REFERENCES public.ujian(id) ON DELETE CASCADE,
    kelas_id UUID REFERENCES public.kelas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (ujian_id, kelas_id)
);

ALTER TABLE public.ujian_kelas ENABLE ROW LEVEL SECURITY;

-- 2. Migrate existing data
INSERT INTO public.ujian_kelas (ujian_id, kelas_id)
SELECT id, kelas_id FROM public.ujian WHERE kelas_id IS NOT NULL;

-- 3. Update Siswa RLS on Ujian table
DROP POLICY IF EXISTS "Siswa can view ujian in joined kelas" ON public.ujian;

CREATE POLICY "Siswa can view ujian in joined kelas" ON public.ujian FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siswa')
  AND (
    NOT EXISTS (SELECT 1 FROM ujian_kelas WHERE ujian_id = ujian.id)
    OR
    EXISTS (
      SELECT 1 FROM kelas_members km
      JOIN ujian_kelas uk ON km.kelas_id = uk.kelas_id
      WHERE uk.ujian_id = ujian.id AND km.siswa_id = auth.uid()
    )
  )
);

-- 4. RLS policies for ujian_kelas table
CREATE POLICY "Admin and Guru can manage ujian_kelas" ON public.ujian_kelas FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'guru'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'guru'))
);

CREATE POLICY "Siswa can view ujian_kelas" ON public.ujian_kelas FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siswa')
);

-- 5. Drop old kelas_id from ujian
ALTER TABLE public.ujian DROP COLUMN IF EXISTS kelas_id CASCADE;
