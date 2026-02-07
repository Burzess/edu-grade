-- Migration untuk memperbaiki infinite recursion di RLS policies
-- Masalah: Policy kelas_select_siswa mengacu ke kelas_members, dan sebaliknya

-- ===================================
-- 1. DROP SEMUA POLICY YANG BERMASALAH
-- ===================================

-- Drop semua policy lama di kelas_members
DROP POLICY IF EXISTS "kelas_members_select_guru" ON "public"."kelas_members";
DROP POLICY IF EXISTS "kelas_members_select_siswa" ON "public"."kelas_members";
DROP POLICY IF EXISTS "kelas_members_insert_siswa" ON "public"."kelas_members";
DROP POLICY IF EXISTS "kelas_members_delete_guru" ON "public"."kelas_members";
DROP POLICY IF EXISTS "kelas_members_delete_siswa" ON "public"."kelas_members";

-- Drop policy yang bermasalah di kelas
DROP POLICY IF EXISTS "kelas_select_siswa" ON "public"."kelas";

-- ===================================
-- 2. BUAT POLICY SEDERHANA TANPA CIRCULAR REFERENCE
-- ===================================

-- Policy untuk kelas_members - guru bisa lihat member kelas yang mereka buat
CREATE POLICY "guru_bisa_lihat_anggota_kelas_sendiri" 
ON "public"."kelas_members" 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM kelas 
    WHERE kelas.id = kelas_members.kelas_id 
    AND kelas.created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'guru'
    )
  )
);

-- Policy untuk kelas_members - siswa bisa lihat kelas yang mereka ikuti
CREATE POLICY "siswa_bisa_lihat_kelas_yang_diikuti" 
ON "public"."kelas_members" 
FOR SELECT 
TO authenticated 
USING (
  siswa_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
);

-- Policy untuk kelas_members - siswa bisa join kelas
CREATE POLICY "siswa_bisa_join_kelas" 
ON "public"."kelas_members" 
FOR INSERT 
TO authenticated 
WITH CHECK (
  siswa_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
);

-- Policy untuk kelas_members - guru bisa remove siswa dari kelas mereka
CREATE POLICY "guru_bisa_remove_siswa_dari_kelas_sendiri" 
ON "public"."kelas_members" 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM kelas 
    WHERE kelas.id = kelas_members.kelas_id 
    AND kelas.created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'guru'
    )
  )
);

-- Policy untuk kelas_members - siswa bisa keluar dari kelas sendiri
CREATE POLICY "siswa_bisa_keluar_dari_kelas" 
ON "public"."kelas_members" 
FOR DELETE 
TO authenticated 
USING (
  siswa_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
);

-- ===================================
-- 3. BUAT POLICY KELAS YANG AMAN
-- ===================================

-- Policy baru untuk siswa lihat kelas - TANPA mengacu ke kelas_members
-- Siswa hanya bisa lihat kelas melalui RPC function atau explicit join
CREATE POLICY "siswa_bisa_lihat_kelas_terbuka" 
ON "public"."kelas" 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
  -- Siswa bisa lihat semua kelas untuk bisa join
  -- Tapi data sensitive akan difilter di application level
);

-- ===================================
-- 4. BUAT RPC FUNCTION UNTUK KELAS SISWA
-- ===================================

-- Function: Ambil kelas yang diikuti siswa (tanpa RLS recursion)
CREATE OR REPLACE FUNCTION ambil_kelas_siswa()
RETURNS TABLE (
  id uuid,
  nama_kelas varchar,
  deskripsi text,
  kode_kelas varchar,
  guru_name text,
  joined_at timestamptz
)
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Pastikan user adalah siswa
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya siswa yang bisa mengakses function ini';
  END IF;

  RETURN QUERY
  SELECT 
    k.id,
    k.nama_kelas,
    k.deskripsi,
    k.kode_kelas,
    p.full_name as guru_name,
    km.joined_at
  FROM kelas k
  INNER JOIN kelas_members km ON k.id = km.kelas_id
  INNER JOIN profiles p ON k.created_by = p.id
  WHERE km.siswa_id = auth.uid();
END;
$$;

-- Grant permission
REVOKE ALL ON FUNCTION ambil_kelas_siswa() FROM public;
GRANT EXECUTE ON FUNCTION ambil_kelas_siswa() TO authenticated;

-- ===================================
-- 5. FUNCTION UNTUK GURU LIHAT ANGGOTA KELAS
-- ===================================

-- Function: Ambil anggota kelas untuk guru
CREATE OR REPLACE FUNCTION ambil_anggota_kelas(p_kelas_id uuid)
RETURNS TABLE (
  siswa_id uuid,
  siswa_name text,
  siswa_email text,
  joined_at timestamptz
)
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Pastikan user adalah guru dan pemilik kelas
  IF NOT EXISTS (
    SELECT 1 FROM kelas k
    INNER JOIN profiles p ON k.created_by = p.id
    WHERE k.id = p_kelas_id 
    AND k.created_by = auth.uid()
    AND p.role = 'guru'
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya guru pemilik kelas yang bisa melihat anggota';
  END IF;

  RETURN QUERY
  SELECT 
    km.siswa_id,
    p.full_name as siswa_name,
    p.email as siswa_email,
    km.joined_at
  FROM kelas_members km
  INNER JOIN profiles p ON km.siswa_id = p.id
  WHERE km.kelas_id = p_kelas_id
  ORDER BY km.joined_at DESC;
END;
$$;

-- Grant permission
REVOKE ALL ON FUNCTION ambil_anggota_kelas(uuid) FROM public;
GRANT EXECUTE ON FUNCTION ambil_anggota_kelas(uuid) TO authenticated;

-- ===================================
-- 6. FUNCTION UNTUK CHECK MEMBERSHIP
-- ===================================

-- Function: Cek apakah siswa sudah join kelas tertentu
CREATE OR REPLACE FUNCTION cek_siswa_sudah_join_kelas(p_kelas_id uuid)
RETURNS boolean
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Pastikan user adalah siswa
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM kelas_members 
    WHERE kelas_id = p_kelas_id 
    AND siswa_id = auth.uid()
  );
END;
$$;

-- Grant permission
REVOKE ALL ON FUNCTION cek_siswa_sudah_join_kelas(uuid) FROM public;
GRANT EXECUTE ON FUNCTION cek_siswa_sudah_join_kelas(uuid) TO authenticated;

-- ===================================
-- 7. PASTIKAN RLS ENABLED
-- ===================================

ALTER TABLE "public"."kelas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."kelas_members" ENABLE ROW LEVEL SECURITY;

-- ===================================
-- LOG COMPLETION
-- ===================================

DO $$
BEGIN
  RAISE NOTICE 'Infinite recursion RLS fix completed successfully';
  RAISE NOTICE 'New RPC functions created:';
  RAISE NOTICE '- ambil_kelas_siswa()';
  RAISE NOTICE '- ambil_anggota_kelas(uuid)';
  RAISE NOTICE '- cek_siswa_sudah_join_kelas(uuid)';
END $$;