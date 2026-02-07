-- Migration untuk memperbaiki RLS policies
-- Mengganti policy yang menggunakan 'TO public' menjadi 'TO authenticated'

-- ===================================
-- 1. PERBAIKI UJIAN POLICIES
-- ===================================

-- Drop semua policy lama yang bermasalah untuk ujian
DROP POLICY IF EXISTS "Users can view their own ujian" ON "public"."ujian";
DROP POLICY IF EXISTS "authenticated_users_can_view_own_ujian" ON "public"."ujian";
DROP POLICY IF EXISTS "guru_bisa_lihat_ujian_sendiri" ON "public"."ujian";

-- Policy: Guru bisa melihat ujian yang mereka buat sendiri
CREATE POLICY "guru_bisa_lihat_ujian_sendiri" 
ON "public"."ujian" 
FOR SELECT 
TO authenticated 
USING (auth.uid() = created_by);

-- Drop policy lama untuk insert
DROP POLICY IF EXISTS "Users can insert their own ujian" ON "public"."ujian";
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_ujian" ON "public"."ujian";
DROP POLICY IF EXISTS "guru_bisa_buat_ujian_baru" ON "public"."ujian";

-- Policy: Guru bisa membuat ujian baru
CREATE POLICY "guru_bisa_buat_ujian_baru" 
ON "public"."ujian" 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

-- Drop policy lama untuk update
DROP POLICY IF EXISTS "Users can update their own ujian" ON "public"."ujian";
DROP POLICY IF EXISTS "authenticated_users_can_update_own_ujian" ON "public"."ujian";
DROP POLICY IF EXISTS "guru_bisa_edit_ujian_sendiri" ON "public"."ujian";

-- Policy: Guru bisa mengedit ujian yang mereka buat sendiri
CREATE POLICY "guru_bisa_edit_ujian_sendiri" 
ON "public"."ujian" 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Drop policy lama untuk delete
DROP POLICY IF EXISTS "Users can delete their own ujian" ON "public"."ujian";
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_ujian" ON "public"."ujian";
DROP POLICY IF EXISTS "guru_bisa_hapus_ujian_sendiri" ON "public"."ujian";

-- Policy: Guru bisa menghapus ujian yang mereka buat sendiri
CREATE POLICY "guru_bisa_hapus_ujian_sendiri" 
ON "public"."ujian" 
FOR DELETE 
TO authenticated 
USING (auth.uid() = created_by);

-- ===================================
-- 2. PERBAIKI SOAL POLICIES
-- ===================================

-- Drop policy lama untuk insert soal
DROP POLICY IF EXISTS "Users can insert their own soal" ON "public"."soal";
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_soal" ON "public"."soal";
DROP POLICY IF EXISTS "guru_bisa_buat_soal_baru" ON "public"."soal";

-- Policy: Guru bisa membuat soal baru
CREATE POLICY "guru_bisa_buat_soal_baru" 
ON "public"."soal" 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

-- Drop policy lama untuk update soal
DROP POLICY IF EXISTS "Users can update their own soal" ON "public"."soal";
DROP POLICY IF EXISTS "authenticated_users_can_update_own_soal" ON "public"."soal";
DROP POLICY IF EXISTS "guru_bisa_edit_soal_sendiri" ON "public"."soal";

-- Policy: Guru bisa mengedit soal yang mereka buat sendiri
CREATE POLICY "guru_bisa_edit_soal_sendiri" 
ON "public"."soal" 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Drop policy lama untuk delete soal
DROP POLICY IF EXISTS "Users can delete their own soal" ON "public"."soal";
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_soal" ON "public"."soal";
DROP POLICY IF EXISTS "guru_bisa_hapus_soal_sendiri" ON "public"."soal";

-- Policy: Guru bisa menghapus soal yang mereka buat sendiri
CREATE POLICY "guru_bisa_hapus_soal_sendiri" 
ON "public"."soal" 
FOR DELETE 
TO authenticated 
USING (auth.uid() = created_by);

-- ===================================
-- 3. PERBAIKI UJIAN_SOAL POLICIES
-- ===================================

-- Drop policy lama untuk view ujian_soal
DROP POLICY IF EXISTS "Users can view their own ujian_soal" ON "public"."ujian_soal";
DROP POLICY IF EXISTS "authenticated_users_can_view_own_ujian_soal" ON "public"."ujian_soal";
DROP POLICY IF EXISTS "guru_bisa_lihat_soal_ujian_sendiri" ON "public"."ujian_soal";

-- Policy: Guru bisa melihat soal-soal dari ujian yang mereka buat
CREATE POLICY "guru_bisa_lihat_soal_ujian_sendiri" 
ON "public"."ujian_soal" 
FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM ujian 
  WHERE ujian.id = ujian_soal.ujian_id 
  AND ujian.created_by = auth.uid()
));

-- Drop policy lama untuk insert ujian_soal
DROP POLICY IF EXISTS "Users can insert their own ujian_soal" ON "public"."ujian_soal";
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_ujian_soal" ON "public"."ujian_soal";
DROP POLICY IF EXISTS "guru_bisa_tambah_soal_ke_ujian_sendiri" ON "public"."ujian_soal";

-- Policy: Guru bisa menambahkan soal ke ujian yang mereka buat
CREATE POLICY "guru_bisa_tambah_soal_ke_ujian_sendiri" 
ON "public"."ujian_soal" 
FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM ujian 
  WHERE ujian.id = ujian_soal.ujian_id 
  AND ujian.created_by = auth.uid()
));

-- Drop policy lama untuk update ujian_soal
DROP POLICY IF EXISTS "Users can update their own ujian_soal" ON "public"."ujian_soal";
DROP POLICY IF EXISTS "authenticated_users_can_update_own_ujian_soal" ON "public"."ujian_soal";
DROP POLICY IF EXISTS "guru_bisa_edit_soal_ujian_sendiri" ON "public"."ujian_soal";

-- Policy: Guru bisa mengedit pengaturan soal di ujian yang mereka buat
CREATE POLICY "guru_bisa_edit_soal_ujian_sendiri" 
ON "public"."ujian_soal" 
FOR UPDATE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM ujian 
  WHERE ujian.id = ujian_soal.ujian_id 
  AND ujian.created_by = auth.uid()
));

-- Drop policy lama untuk delete ujian_soal
DROP POLICY IF EXISTS "Users can delete their own ujian_soal" ON "public"."ujian_soal";
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_ujian_soal" ON "public"."ujian_soal";
DROP POLICY IF EXISTS "guru_bisa_hapus_soal_dari_ujian_sendiri" ON "public"."ujian_soal";

-- Policy: Guru bisa menghapus soal dari ujian yang mereka buat
CREATE POLICY "guru_bisa_hapus_soal_dari_ujian_sendiri" 
ON "public"."ujian_soal" 
FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM ujian 
  WHERE ujian.id = ujian_soal.ujian_id 
  AND ujian.created_by = auth.uid()
));

-- ===================================
-- 4. PERBAIKI JAWABAN_SISWA POLICIES 
-- ===================================

-- Drop policy lama untuk siswa lihat jawaban
DROP POLICY IF EXISTS "Students can view their own answers" ON "public"."jawaban_siswa";
DROP POLICY IF EXISTS "authenticated_students_can_view_own_answers" ON "public"."jawaban_siswa";
DROP POLICY IF EXISTS "siswa_bisa_lihat_jawaban_sendiri" ON "public"."jawaban_siswa";

-- Policy: Siswa bisa melihat jawaban yang mereka submit sendiri
CREATE POLICY "siswa_bisa_lihat_jawaban_sendiri" 
ON "public"."jawaban_siswa" 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = siswa_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
);

-- Drop policy lama untuk siswa insert jawaban
DROP POLICY IF EXISTS "Students can insert their own answers" ON "public"."jawaban_siswa";
DROP POLICY IF EXISTS "authenticated_students_can_insert_own_answers" ON "public"."jawaban_siswa";
DROP POLICY IF EXISTS "siswa_bisa_submit_jawaban" ON "public"."jawaban_siswa";

-- Policy: Siswa bisa submit jawaban untuk ujian yang sedang aktif
CREATE POLICY "siswa_bisa_submit_jawaban" 
ON "public"."jawaban_siswa" 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = siswa_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
);

-- Drop policy lama untuk guru lihat jawaban
DROP POLICY IF EXISTS "Teachers can view answers for their exams" ON "public"."jawaban_siswa";
DROP POLICY IF EXISTS "authenticated_teachers_can_view_exam_answers" ON "public"."jawaban_siswa";
DROP POLICY IF EXISTS "guru_bisa_lihat_jawaban_ujian_sendiri" ON "public"."jawaban_siswa";

-- Policy: Guru bisa melihat semua jawaban dari ujian yang mereka buat
CREATE POLICY "guru_bisa_lihat_jawaban_ujian_sendiri" 
ON "public"."jawaban_siswa" 
FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM ujian 
  WHERE ujian.id = jawaban_siswa.ujian_id 
  AND ujian.created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'guru'
  )
));

-- Drop policy lama untuk guru update nilai
DROP POLICY IF EXISTS "Teachers can update scores for their exams" ON "public"."jawaban_siswa";
DROP POLICY IF EXISTS "authenticated_teachers_can_update_exam_scores" ON "public"."jawaban_siswa";
DROP POLICY IF EXISTS "guru_bisa_kasih_nilai_ujian_sendiri" ON "public"."jawaban_siswa";

-- Policy: Guru bisa memberikan nilai pada jawaban ujian yang mereka buat
CREATE POLICY "guru_bisa_kasih_nilai_ujian_sendiri" 
ON "public"."jawaban_siswa" 
FOR UPDATE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM ujian 
  WHERE ujian.id = jawaban_siswa.ujian_id 
  AND ujian.created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'guru'
  )
));

-- ===================================
-- 5. BUAT RPC FUNCTION UNTUK STATISTIK DASHBOARD
-- ===================================

-- Drop function lama jika ada
DROP FUNCTION IF EXISTS get_user_ujian_stats();
DROP FUNCTION IF EXISTS ambil_statistik_ujian_guru();

-- Function: Ambil statistik ujian untuk dashboard guru
CREATE OR REPLACE FUNCTION ambil_statistik_ujian_guru()
RETURNS TABLE (
  total_ujian bigint,
  ujian_aktif bigint,
  ujian_selesai bigint,
  ujian_draft bigint
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Pastikan user sudah login
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User belum login';
  END IF;
  
  -- Log untuk debugging
  RAISE NOTICE 'Mengambil statistik ujian untuk guru: %', auth.uid();
  
  RETURN QUERY
  SELECT 
    COUNT(*) as total_ujian,
    COUNT(*) FILTER (WHERE status = 'active') as ujian_aktif,
    COUNT(*) FILTER (WHERE status = 'completed') as ujian_selesai,
    COUNT(*) FILTER (WHERE status = 'draft') as ujian_draft
  FROM ujian 
  WHERE created_by = auth.uid();
END;
$$;

-- Berikan permission hanya untuk user yang sudah login
REVOKE ALL ON FUNCTION ambil_statistik_ujian_guru() FROM public;
GRANT EXECUTE ON FUNCTION ambil_statistik_ujian_guru() TO authenticated;

-- ===================================
-- 6. BUAT RPC FUNCTION UNTUK DEBUG AUTH
-- ===================================

-- Function: Cek informasi user yang sedang login (untuk debugging)
CREATE OR REPLACE FUNCTION cek_info_user_login()
RETURNS TABLE (
  id_user_login uuid,
  peran_user text,
  total_ujian_di_database bigint,
  jumlah_ujian_user bigint
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as id_user_login,
    p.role::text as peran_user,
    (SELECT COUNT(*) FROM ujian) as total_ujian_di_database,
    (SELECT COUNT(*) FROM ujian WHERE created_by = auth.uid()) as jumlah_ujian_user
  FROM profiles p 
  WHERE p.id = auth.uid();
END;
$$;

-- Berikan permission untuk debugging
REVOKE ALL ON FUNCTION cek_info_user_login() FROM public;
GRANT EXECUTE ON FUNCTION cek_info_user_login() TO authenticated;

-- ===================================
-- 7. PASTIKAN RLS ENABLED
-- ===================================

ALTER TABLE "public"."ujian" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."soal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ujian_soal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."jawaban_siswa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."kelas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."kelas_members" ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 8. TAMBAHKAN POLICY UNTUK UJIAN_SISWA
-- ===================================

-- Pastikan RLS aktif untuk tabel ujian_siswa
ALTER TABLE "public"."ujian_siswa" ENABLE ROW LEVEL SECURITY;

-- Drop policy lama jika ada
DROP POLICY IF EXISTS "authenticated_students_can_view_own_ujian_siswa" ON "public"."ujian_siswa";
DROP POLICY IF EXISTS "siswa_bisa_lihat_status_ujian_sendiri" ON "public"."ujian_siswa";

-- Policy: Siswa bisa melihat status ujian yang pernah mereka ikuti
CREATE POLICY "siswa_bisa_lihat_status_ujian_sendiri" 
ON "public"."ujian_siswa" 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = siswa_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
);

-- Drop policy lama untuk guru
DROP POLICY IF EXISTS "authenticated_teachers_can_view_ujian_siswa_for_their_exams" ON "public"."ujian_siswa";
DROP POLICY IF EXISTS "guru_bisa_lihat_peserta_ujian_sendiri" ON "public"."ujian_siswa";

-- Policy: Guru bisa melihat daftar peserta ujian yang mereka buat
CREATE POLICY "guru_bisa_lihat_peserta_ujian_sendiri" 
ON "public"."ujian_siswa" 
FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM ujian 
  WHERE ujian.id = ujian_siswa.ujian_id 
  AND ujian.created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'guru'
  )
));

-- Drop policy lama untuk insert
DROP POLICY IF EXISTS "authenticated_students_can_insert_ujian_siswa" ON "public"."ujian_siswa";
DROP POLICY IF EXISTS "siswa_bisa_mulai_ujian" ON "public"."ujian_siswa";

-- Policy: Siswa bisa memulai ujian (mendaftar sebagai peserta)
CREATE POLICY "siswa_bisa_mulai_ujian" 
ON "public"."ujian_siswa" 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = siswa_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
);

-- Drop policy lama untuk update
DROP POLICY IF EXISTS "authenticated_students_can_update_own_ujian_siswa" ON "public"."ujian_siswa";
DROP POLICY IF EXISTS "siswa_bisa_selesaikan_ujian_sendiri" ON "public"."ujian_siswa";

-- Policy: Siswa bisa menyelesaikan ujian yang sedang mereka kerjakan
CREATE POLICY "siswa_bisa_selesaikan_ujian_sendiri" 
ON "public"."ujian_siswa" 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = siswa_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
);

-- ===================================
-- SELESAI
-- ===================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS policies migration completed successfully';
END $$;