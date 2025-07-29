-- Migration: Add duration_minutes and status columns to ujian table
-- Date: 2025-07-28

-- Add duration_minutes column
ALTER TABLE ujian ADD COLUMN duration_minutes integer;

-- Add status column with enum type
CREATE TYPE ujian_status AS ENUM ('draft', 'active', 'completed');
ALTER TABLE ujian ADD COLUMN status ujian_status DEFAULT 'draft';

-- Update start_time and end_time to be nullable (since ujian will start when teacher clicks start)
ALTER TABLE ujian ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE ujian ALTER COLUMN end_time DROP NOT NULL;

-- Add constraint to ensure duration_minutes is positive
ALTER TABLE ujian ADD CONSTRAINT ujian_duration_positive CHECK (duration_minutes > 0);

-- Add constraint to ensure duration_minutes is reasonable (max 8 hours = 480 minutes)
ALTER TABLE ujian ADD CONSTRAINT ujian_duration_max CHECK (duration_minutes <= 480);

-- Update existing records to have a default duration of 60 minutes
UPDATE ujian SET duration_minutes = 60 WHERE duration_minutes IS NULL;

-- Make duration_minutes NOT NULL after setting default values
ALTER TABLE ujian ALTER COLUMN duration_minutes SET NOT NULL;

-- Add comment to explain the new structure
COMMENT ON COLUMN ujian.duration_minutes IS 'Duration of the exam in minutes';
COMMENT ON COLUMN ujian.status IS 'Status of the exam: draft (created but not started), active (currently running), completed (finished)';
COMMENT ON COLUMN ujian.start_time IS 'Actual start time when exam is activated (nullable until exam starts)';
COMMENT ON COLUMN ujian.end_time IS 'Actual end time when exam is completed (nullable until exam ends)';
