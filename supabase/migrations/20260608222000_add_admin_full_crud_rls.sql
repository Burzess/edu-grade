-- Migration: Add Admin Full CRUD policies for core tables
-- Created: 2026-06-08

-- UJIAN
DROP POLICY IF EXISTS "admin_all_ujian" ON "public"."ujian";
CREATE POLICY "admin_all_ujian" ON "public"."ujian" FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- SOAL
DROP POLICY IF EXISTS "admin_all_soal" ON "public"."soal";
CREATE POLICY "admin_all_soal" ON "public"."soal" FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- UJIAN_SOAL
DROP POLICY IF EXISTS "admin_all_ujian_soal" ON "public"."ujian_soal";
CREATE POLICY "admin_all_ujian_soal" ON "public"."ujian_soal" FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- KELAS
DROP POLICY IF EXISTS "admin_all_kelas" ON "public"."kelas";
CREATE POLICY "admin_all_kelas" ON "public"."kelas" FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- JAWABAN_SISWA
DROP POLICY IF EXISTS "admin_all_jawaban_siswa" ON "public"."jawaban_siswa";
CREATE POLICY "admin_all_jawaban_siswa" ON "public"."jawaban_siswa" FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- KELAS_MEMBERS
DROP POLICY IF EXISTS "admin_all_kelas_members" ON "public"."kelas_members";
CREATE POLICY "admin_all_kelas_members" ON "public"."kelas_members" FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
