-- Migration: Add guru_id to ujian and kelas

-- 1. Add guru_id to ujian
ALTER TABLE public.ujian ADD COLUMN IF NOT EXISTS guru_id UUID REFERENCES public.profiles(id);

-- 2. Add guru_id to kelas
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS guru_id UUID REFERENCES public.profiles(id);

-- 3. Populate guru_id from existing data if possible
-- Assuming the current created_by for guru's data was moved to admin, but maybe we can just leave guru_id NULL for now.
-- Or we can assign the first available guru to existing exams/classes if we want.
DO $$
DECLARE
    first_guru_id UUID;
BEGIN
    SELECT id INTO first_guru_id FROM public.profiles WHERE role = 'guru' LIMIT 1;
    
    IF first_guru_id IS NOT NULL THEN
        UPDATE public.ujian SET guru_id = first_guru_id WHERE guru_id IS NULL;
        UPDATE public.kelas SET guru_id = first_guru_id WHERE guru_id IS NULL;
    END IF;
END $$;

-- 4. Update Policies for bank_soal
DROP POLICY IF EXISTS "guru_all_soal" ON public.bank_soal;

CREATE POLICY "guru_manage_own_soal" ON public.bank_soal
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.ujian u
        WHERE u.id = bank_soal.ujian_id
        AND u.guru_id = auth.uid()
    )
);

-- 5. Update Policies for ujian to restrict Guru
DROP POLICY IF EXISTS "guru_select_ujian" ON public.ujian;
CREATE POLICY "guru_select_assigned_ujian" ON public.ujian
FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'guru' AND guru_id = auth.uid()) OR
    (auth.jwt() ->> 'role' = 'admin')
);

-- 6. Update View: exam_with_teacher_and_questions
CREATE OR REPLACE VIEW public.exam_with_teacher_and_questions AS
SELECT 
    u.id AS exam_id,
    u.name AS exam_name,
    u.description,
    u.status,
    u.start_time,
    u.end_time,
    u.duration_minutes,
    p.full_name AS teacher_name,
    count(us.id) AS total_questions,
    u.created_at
FROM public.ujian u
LEFT JOIN public.profiles p ON u.guru_id = p.id
LEFT JOIN public.ujian_soal us ON u.id = us.ujian_id
GROUP BY 
    u.id, 
    u.name, 
    u.description, 
    u.status, 
    u.start_time, 
    u.end_time, 
    u.duration_minutes, 
    p.full_name, 
    u.created_at;

-- 7. Update View: exam_with_teacher_name
CREATE OR REPLACE VIEW public.exam_with_teacher_name AS
SELECT 
    u.id AS exam_id,
    u.name AS exam_name,
    u.description,
    u.status,
    u.start_time,
    u.end_time,
    u.duration_minutes,
    p.full_name AS teacher_name,
    u.created_at
FROM public.ujian u
LEFT JOIN public.profiles p ON u.guru_id = p.id;

-- 8. Update View: kelas_members_detail
CREATE OR REPLACE VIEW public.kelas_members_detail AS
SELECT 
    km.id,
    km.kelas_id,
    km.siswa_id,
    km.joined_at,
    k.nama_kelas,
    k.kode_kelas,
    ps.full_name AS siswa_name,
    ps.email AS siswa_email,
    pg.full_name AS guru_name
FROM public.kelas_members km
JOIN public.kelas k ON km.kelas_id = k.id
JOIN public.profiles ps ON km.siswa_id = ps.id
LEFT JOIN public.profiles pg ON k.guru_id = pg.id;

-- 9. Update View: kelas_with_member_count
CREATE OR REPLACE VIEW public.kelas_with_member_count AS
SELECT 
    k.id,
    k.nama_kelas,
    k.deskripsi,
    k.kode_kelas,
    k.created_by,
    k.created_at,
    k.updated_at,
    COALESCE(count(km.siswa_id), 0::bigint) AS jumlah_siswa,
    p.full_name AS guru_name
FROM public.kelas k
LEFT JOIN public.kelas_members km ON k.id = km.kelas_id
LEFT JOIN public.profiles p ON k.guru_id = p.id
GROUP BY 
    k.id, 
    k.nama_kelas, 
    k.deskripsi, 
    k.kode_kelas, 
    k.created_by, 
    k.created_at, 
    k.updated_at, 
    p.full_name;
