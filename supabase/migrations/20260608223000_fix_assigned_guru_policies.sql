-- Migration: Fix policies for assigned gurus
-- Created: 2026-06-08

-- 1. Fix SELECT policy on ujian so assigned guru can see the exam
DROP POLICY IF EXISTS "guru_select_assigned_ujian" ON public.ujian;
CREATE POLICY "guru_select_assigned_ujian" ON public.ujian
FOR SELECT TO authenticated USING (
    guru_id = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 2. Fix UPDATE policy on ujian so assigned guru can edit the exam details
DROP POLICY IF EXISTS "guru_bisa_edit_ujian_sendiri" ON "public"."ujian";
CREATE POLICY "guru_bisa_edit_ujian_sendiri" ON "public"."ujian"
FOR UPDATE TO authenticated USING (
    auth.uid() = created_by OR guru_id = auth.uid()
) WITH CHECK (
    auth.uid() = created_by OR guru_id = auth.uid()
);

-- 3. Fix policies on ujian_soal so assigned guru can manage questions
DROP POLICY IF EXISTS "guru_bisa_lihat_soal_ujian_sendiri" ON "public"."ujian_soal";
CREATE POLICY "guru_bisa_lihat_soal_ujian_sendiri" ON "public"."ujian_soal"
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM ujian 
        WHERE ujian.id = ujian_soal.ujian_id 
        AND (ujian.created_by = auth.uid() OR ujian.guru_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "guru_bisa_tambah_soal_ke_ujian_sendiri" ON "public"."ujian_soal";
CREATE POLICY "guru_bisa_tambah_soal_ke_ujian_sendiri" ON "public"."ujian_soal"
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM ujian 
        WHERE ujian.id = ujian_soal.ujian_id 
        AND (ujian.created_by = auth.uid() OR ujian.guru_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "guru_bisa_edit_soal_ujian_sendiri" ON "public"."ujian_soal";
CREATE POLICY "guru_bisa_edit_soal_ujian_sendiri" ON "public"."ujian_soal"
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM ujian 
        WHERE ujian.id = ujian_soal.ujian_id 
        AND (ujian.created_by = auth.uid() OR ujian.guru_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "guru_bisa_hapus_soal_dari_ujian_sendiri" ON "public"."ujian_soal";
CREATE POLICY "guru_bisa_hapus_soal_dari_ujian_sendiri" ON "public"."ujian_soal"
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM ujian 
        WHERE ujian.id = ujian_soal.ujian_id 
        AND (ujian.created_by = auth.uid() OR ujian.guru_id = auth.uid())
    )
);

-- 4. Fix policy on jawaban_siswa so assigned guru can view & grade answers
DROP POLICY IF EXISTS "guru_bisa_lihat_jawaban_ujian_sendiri" ON "public"."jawaban_siswa";
CREATE POLICY "guru_bisa_lihat_jawaban_ujian_sendiri" ON "public"."jawaban_siswa"
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM ujian 
        WHERE ujian.id = jawaban_siswa.ujian_id 
        AND (ujian.created_by = auth.uid() OR ujian.guru_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "guru_bisa_kasih_nilai_ujian_sendiri" ON "public"."jawaban_siswa";
CREATE POLICY "guru_bisa_kasih_nilai_ujian_sendiri" ON "public"."jawaban_siswa"
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM ujian 
        WHERE ujian.id = jawaban_siswa.ujian_id 
        AND (ujian.created_by = auth.uid() OR ujian.guru_id = auth.uid())
    )
);
