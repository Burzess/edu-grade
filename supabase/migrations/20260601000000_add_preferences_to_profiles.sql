-- Migration: Tambah kolom preferences JSONB ke tabel profiles
-- Menyimpan preferensi pengguna (exam defaults, UI settings) di database
-- sehingga tersinkronisasi antar browser/perangkat.

ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "preferences" jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN "public"."profiles"."preferences"
  IS 'User preferences stored as JSON. For guru: exam defaults, sidebar settings, theme.';
