-- Add rubric column to soal table
ALTER TABLE "public"."soal" ADD COLUMN IF NOT EXISTS "rubric" text;
