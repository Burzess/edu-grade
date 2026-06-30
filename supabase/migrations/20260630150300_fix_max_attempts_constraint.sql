-- Fix max_attempts constraint to allow 0 (unlimited)
ALTER TABLE "public"."ujian" DROP CONSTRAINT IF EXISTS "ujian_max_attempts_min";
ALTER TABLE "public"."ujian" ADD CONSTRAINT "ujian_max_attempts_min" CHECK ("max_attempts" >= 0);
