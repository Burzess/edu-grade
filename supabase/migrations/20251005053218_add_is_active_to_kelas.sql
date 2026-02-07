-- Add is_active field to kelas table
-- This migration adds status field untuk mengaktifkan/menonaktifkan kelas

-- Add is_active column to kelas table
ALTER TABLE kelas 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Add comment untuk field baru
COMMENT ON COLUMN kelas.is_active IS 'Status aktif kelas - true: aktif, false: nonaktif';

-- Update existing records to be active by default
UPDATE kelas SET is_active = true WHERE is_active IS NULL;

-- Add index untuk performa query berdasarkan status
CREATE INDEX IF NOT EXISTS idx_kelas_is_active ON kelas(is_active);
