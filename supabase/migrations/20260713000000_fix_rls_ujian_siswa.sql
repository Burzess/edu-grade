-- Migration: Perbaikan dan penyederhanaan RLS policy untuk tabel ujian_siswa
-- Memastikan siswa dapat membaca (SELECT), memulai (INSERT), dan menyelesaikan (UPDATE) ujian mereka sendiri tanpa kendala join RLS profiles.

ALTER TABLE "public"."ujian_siswa" ENABLE ROW LEVEL SECURITY;

-- 1. Drop old policies for siswa
DROP POLICY IF EXISTS "siswa_bisa_lihat_status_ujian_sendiri" ON "public"."ujian_siswa";
DROP POLICY IF EXISTS "siswa_bisa_mulai_ujian" ON "public"."ujian_siswa";
DROP POLICY IF EXISTS "siswa_bisa_selesaikan_ujian_sendiri" ON "public"."ujian_siswa";
DROP POLICY IF EXISTS "authenticated_students_can_view_own_ujian_siswa" ON "public"."ujian_siswa";
DROP POLICY IF EXISTS "authenticated_students_can_insert_ujian_siswa" ON "public"."ujian_siswa";
DROP POLICY IF EXISTS "authenticated_students_can_update_own_ujian_siswa" ON "public"."ujian_siswa";

-- 2. Create simplified robust policies for siswa (auth.uid() = siswa_id)
CREATE POLICY "siswa_select_own_ujian_siswa"
ON "public"."ujian_siswa"
FOR SELECT
TO authenticated
USING (auth.uid() = siswa_id);

CREATE POLICY "siswa_insert_own_ujian_siswa"
ON "public"."ujian_siswa"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = siswa_id);

CREATE POLICY "siswa_update_own_ujian_siswa"
ON "public"."ujian_siswa"
FOR UPDATE
TO authenticated
USING (auth.uid() = siswa_id)
WITH CHECK (auth.uid() = siswa_id);
