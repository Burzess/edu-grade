-- Migration: Add UPDATE policy for siswa on jawaban_siswa

-- Drop policy if exists (for idempotency)
DROP POLICY IF EXISTS "siswa_bisa_update_jawaban_sendiri" ON "public"."jawaban_siswa";

-- Policy: Siswa bisa mengupdate jawaban yang sudah mereka buat
CREATE POLICY "siswa_bisa_update_jawaban_sendiri" 
ON "public"."jawaban_siswa" 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = siswa_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
)
WITH CHECK (
  auth.uid() = siswa_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'siswa'
  )
);
