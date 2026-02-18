-- Migration: Add Remidi (Remedial Exam) Feature
-- Allows teachers to enable re-take for exams, 
-- and the highest score across attempts is used as final score.

-- 1. Add remidi columns to ujian table
ALTER TABLE "public"."ujian"
  ADD COLUMN IF NOT EXISTS "allow_remidi" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER DEFAULT 1;

COMMENT ON COLUMN "public"."ujian"."allow_remidi" IS 'Whether students can retake this exam (remedial)';
COMMENT ON COLUMN "public"."ujian"."max_attempts" IS 'Maximum number of attempts allowed (1 = no remidi, 2+ = remidi allowed)';

-- 2. Add attempt_number to ujian_siswa
ALTER TABLE "public"."ujian_siswa"
  ADD COLUMN IF NOT EXISTS "attempt_number" INTEGER DEFAULT 1;

COMMENT ON COLUMN "public"."ujian_siswa"."attempt_number" IS 'Attempt number for this exam (1 = first attempt, 2+ = remidi)';

-- 3. Add attempt_number to jawaban_siswa
ALTER TABLE "public"."jawaban_siswa"
  ADD COLUMN IF NOT EXISTS "attempt_number" INTEGER DEFAULT 1;

COMMENT ON COLUMN "public"."jawaban_siswa"."attempt_number" IS 'Matches the attempt_number in ujian_siswa for this set of answers';

-- 4. Drop old unique constraint and create new one that includes attempt_number
ALTER TABLE "public"."ujian_siswa" DROP CONSTRAINT IF EXISTS "unique_ujian_siswa";
ALTER TABLE "public"."ujian_siswa" ADD CONSTRAINT "unique_ujian_siswa_attempt" UNIQUE ("ujian_id", "siswa_id", "attempt_number");

-- 5. Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_ujian_siswa_attempt" ON "public"."ujian_siswa" USING "btree" ("ujian_id", "siswa_id", "attempt_number");
CREATE INDEX IF NOT EXISTS "idx_jawaban_attempt" ON "public"."jawaban_siswa" USING "btree" ("ujian_id", "siswa_id", "attempt_number");

-- 6. Add constraint: max_attempts must be >= 1
ALTER TABLE "public"."ujian" ADD CONSTRAINT "ujian_max_attempts_min" CHECK ("max_attempts" >= 1);
