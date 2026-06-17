-- Migration: Separate Ujian and Bank Soal roles

-- 1. Create bank_soal table
CREATE TABLE IF NOT EXISTS public.bank_soal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ujian_id UUID NOT NULL REFERENCES public.ujian(id) ON DELETE CASCADE,
    tipe_soal VARCHAR(20) DEFAULT 'essay',
    konten_soal TEXT NOT NULL,
    rubrik_ai TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_soal_ujian_id ON public.bank_soal(ujian_id);
CREATE INDEX IF NOT EXISTS idx_bank_soal_created_by ON public.bank_soal(created_by);

-- Enable RLS
ALTER TABLE public.bank_soal ENABLE ROW LEVEL SECURITY;

-- 2. Setup Policies for bank_soal
-- Guru can do everything on bank_soal
CREATE POLICY "guru_all_soal" ON public.bank_soal
FOR ALL USING (auth.jwt() ->> 'role' = 'guru');

-- 3. Modify Policies for ujian
-- Drop Guru DML policies on ujian
DROP POLICY IF EXISTS "guru_bisa_buat_ujian_baru" ON public.ujian;
DROP POLICY IF EXISTS "guru_bisa_edit_ujian_sendiri" ON public.ujian;
DROP POLICY IF EXISTS "guru_bisa_hapus_ujian_sendiri" ON public.ujian;
DROP POLICY IF EXISTS "Guru can manage own ujian" ON public.ujian;

-- Admin can do everything on ujian
DROP POLICY IF EXISTS "admin_all_ujian" ON public.ujian;
CREATE POLICY "admin_all_ujian" ON public.ujian
FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Guru can SELECT ujian
DROP POLICY IF EXISTS "guru_select_ujian" ON public.ujian;
CREATE POLICY "guru_select_ujian" ON public.ujian
FOR SELECT USING (auth.jwt() ->> 'role' = 'guru');

-- Add triggers for updated_at
CREATE TRIGGER "update_bank_soal_updated_at" 
BEFORE UPDATE ON "public"."bank_soal" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
