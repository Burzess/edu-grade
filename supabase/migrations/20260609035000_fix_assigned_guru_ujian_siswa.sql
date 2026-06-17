-- Migration: Fix policies for assigned gurus on ujian_siswa table
-- Created: 2026-06-09

-- 1. Fix SELECT policy on ujian_siswa so assigned guru can see the exam attempts
DROP POLICY IF EXISTS "guru_bisa_lihat_ujian_siswa_sendiri" ON "public"."ujian_siswa";
CREATE POLICY "guru_bisa_lihat_ujian_siswa_sendiri" ON "public"."ujian_siswa"
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM ujian 
        WHERE ujian.id = ujian_siswa.ujian_id 
        AND (ujian.created_by = auth.uid() OR ujian.guru_id = auth.uid())
    )
);

-- 2. Fix UPDATE policy on ujian_siswa so assigned guru can grade/manage attempts
DROP POLICY IF EXISTS "guru_bisa_edit_ujian_siswa_sendiri" ON "public"."ujian_siswa";
CREATE POLICY "guru_bisa_edit_ujian_siswa_sendiri" ON "public"."ujian_siswa"
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM ujian 
        WHERE ujian.id = ujian_siswa.ujian_id 
        AND (ujian.created_by = auth.uid() OR ujian.guru_id = auth.uid())
    )
);

-- 3. Fix DELETE policy on ujian_siswa (just in case they need to reset an attempt)
DROP POLICY IF EXISTS "guru_bisa_hapus_ujian_siswa_sendiri" ON "public"."ujian_siswa";
CREATE POLICY "guru_bisa_hapus_ujian_siswa_sendiri" ON "public"."ujian_siswa"
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM ujian 
        WHERE ujian.id = ujian_siswa.ujian_id 
        AND (ujian.created_by = auth.uid() OR ujian.guru_id = auth.uid())
    )
);
