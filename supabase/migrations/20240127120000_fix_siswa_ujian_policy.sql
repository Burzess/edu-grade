-- Perbaiki RLS policy untuk siswa dapat melihat ujian aktif
-- Drop policy lama
DROP POLICY IF EXISTS "Siswa can view active ujian" ON ujian;

-- Buat policy baru yang lebih fleksibel
CREATE POLICY "Siswa can view active ujian" ON ujian
    FOR SELECT
    USING (
        -- User adalah siswa
        (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'siswa'::user_role) IS NOT NULL
        AND
        -- Ujian memiliki status draft atau active
        status IN ('draft', 'active')
        AND
        -- Untuk ujian active: periksa waktu jika start_time dan end_time ada
        (
            status = 'draft' 
            OR 
            (
                status = 'active' 
                AND 
                (
                    -- Jika start_time dan end_time tidak null, periksa rentang waktu
                    (start_time IS NOT NULL AND end_time IS NOT NULL AND now() >= start_time AND now() <= end_time)
                    OR
                    -- Jika hanya start_time yang ada, periksa apakah sudah dimulai dan belum lewat durasi default
                    (start_time IS NOT NULL AND end_time IS NULL AND now() >= start_time AND now() <= (start_time + interval '1 day'))
                    OR
                    -- Jika keduanya null, tampilkan (untuk backward compatibility)
                    (start_time IS NULL AND end_time IS NULL)
                )
            )
        )
    );
