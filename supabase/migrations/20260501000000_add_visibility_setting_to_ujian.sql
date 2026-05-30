-- Migration: Add visibility_setting column to ujian table
-- Feature: Grade Visibility Control
-- Requirements: 1.4, 6.1, 6.3, 5.1

-- Add visibility_setting column with CHECK constraint
ALTER TABLE "public"."ujian"
ADD COLUMN "visibility_setting" TEXT NOT NULL DEFAULT 'visible'
CHECK (visibility_setting IN ('visible', 'hidden'));

-- Comment on the new column
COMMENT ON COLUMN "public"."ujian"."visibility_setting" IS 'Controls whether student scores are visible or hidden. Default is visible.';

-- RLS policy: Only the guru who created the ujian can update visibility_setting
CREATE POLICY "guru_update_visibility" ON "public"."ujian"
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
