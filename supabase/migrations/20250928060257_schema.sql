

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."ujian_status" AS ENUM (
    'draft',
    'active',
    'completed'
);


ALTER TYPE "public"."ujian_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'siswa',
    'guru'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_kode_kelas"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    kode TEXT;
    exists_check BOOLEAN;
    chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
    i INTEGER;
BEGIN
    LOOP
        kode := '';
        
        -- Generate 3 grup dengan 3 karakter masing-masing
        FOR j IN 1..3 LOOP
            IF j > 1 THEN
                kode := kode || '-';
            END IF;
            
            FOR k IN 1..3 LOOP
                i := floor(random() * length(chars) + 1);
                kode := kode || substr(chars, i, 1);
            END LOOP;
        END LOOP;
        
        -- Check apakah kode sudah ada
        SELECT EXISTS(SELECT 1 FROM kelas WHERE kode_kelas = kode) INTO exists_check;
        
        -- Jika belum ada, return kode
        IF NOT exists_check THEN
            RETURN kode;
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_kode_kelas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert dengan error handling
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'siswa')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error tapi jangan fail signup
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_kelas_by_code"("p_kode_kelas" "text", "p_siswa_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    v_kelas_id UUID;
    v_kelas_name TEXT;
    v_already_joined BOOLEAN;
    v_result JSONB;
BEGIN
    -- Validasi siswa
    IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = p_siswa_id AND role = 'siswa') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_USER',
            'message', 'User bukan siswa atau tidak ditemukan'
        );
    END IF;

    -- Cari kelas berdasarkan kode (lebih robust)
    SELECT id, nama_kelas INTO v_kelas_id, v_kelas_name
    FROM kelas 
    WHERE UPPER(kode_kelas) = UPPER(TRIM(p_kode_kelas));
    
    IF v_kelas_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'KELAS_NOT_FOUND',
            'message', 'Kode kelas tidak ditemukan'
        );
    END IF;

    -- Cek apakah siswa sudah bergabung
    SELECT EXISTS(
        SELECT 1 FROM kelas_members 
        WHERE kelas_id = v_kelas_id AND siswa_id = p_siswa_id
    ) INTO v_already_joined;

    IF v_already_joined THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_JOINED',
            'message', 'Anda sudah terdaftar di kelas ini'
        );
    END IF;

    -- Insert ke kelas_members
    INSERT INTO kelas_members (kelas_id, siswa_id)
    VALUES (v_kelas_id, p_siswa_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Berhasil bergabung ke kelas ' || v_kelas_name,
        'kelas_id', v_kelas_id,
        'kelas_name', v_kelas_name
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DATABASE_ERROR',
            'message', 'Terjadi kesalahan: ' || SQLERRM
        );
END;$$;


ALTER FUNCTION "public"."join_kelas_by_code"("p_kode_kelas" "text", "p_siswa_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_siswa_from_kelas"("p_kelas_id" "uuid", "p_siswa_id" "uuid", "p_guru_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_kelas_name TEXT;
    v_siswa_name TEXT;
    v_is_owner BOOLEAN;
BEGIN
    -- Validasi guru adalah pemilik kelas
    SELECT 
        EXISTS(SELECT 1 FROM kelas WHERE id = p_kelas_id AND created_by = p_guru_id),
        nama_kelas
    INTO v_is_owner, v_kelas_name
    FROM kelas 
    WHERE id = p_kelas_id;

    IF NOT v_is_owner THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Anda tidak memiliki akses untuk mengelola kelas ini'
        );
    END IF;

    -- Ambil nama siswa
    SELECT full_name INTO v_siswa_name
    FROM profiles 
    WHERE id = p_siswa_id;

    -- Hapus siswa dari kelas
    DELETE FROM kelas_members 
    WHERE kelas_id = p_kelas_id AND siswa_id = p_siswa_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'NOT_MEMBER',
            'message', 'Siswa tidak terdaftar di kelas ini'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_siswa_name || ' berhasil dikeluarkan dari kelas ' || v_kelas_name
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DATABASE_ERROR',
            'message', 'Terjadi kesalahan: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."remove_siswa_from_kelas"("p_kelas_id" "uuid", "p_siswa_id" "uuid", "p_guru_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_profile_creation"("test_user_id" "uuid", "test_email" "text", "test_full_name" "text" DEFAULT 'Test User'::"text", "test_role" "text" DEFAULT 'siswa'::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (test_user_id, test_email, test_full_name, test_role::user_role);
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."test_profile_creation"("test_user_id" "uuid", "test_email" "text", "test_full_name" "text", "test_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_generate_kode_kelas"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Jika kode_kelas kosong atau null, generate otomatis
    IF NEW.kode_kelas IS NULL OR NEW.kode_kelas = '' THEN
        NEW.kode_kelas := generate_kode_kelas();
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_generate_kode_kelas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ujian" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "duration_minutes" integer NOT NULL,
    "status" "public"."ujian_status" DEFAULT 'draft'::"public"."ujian_status",
    "kelas_id" "uuid",
    CONSTRAINT "ujian_duration_max" CHECK (("duration_minutes" <= 480)),
    CONSTRAINT "ujian_duration_positive" CHECK (("duration_minutes" > 0)),
    CONSTRAINT "valid_exam_time" CHECK (("start_time" < "end_time")),
    CONSTRAINT "valid_time_range" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."ujian" OWNER TO "postgres";


COMMENT ON TABLE "public"."ujian" IS 'Table for storing exam information created by teachers';



COMMENT ON COLUMN "public"."ujian"."name" IS 'Name/title of the exam';



COMMENT ON COLUMN "public"."ujian"."start_time" IS 'Actual start time when exam is activated (nullable until exam starts)';



COMMENT ON COLUMN "public"."ujian"."end_time" IS 'Actual end time when exam is completed (nullable until exam ends)';



COMMENT ON COLUMN "public"."ujian"."description" IS 'Optional description of the exam';



COMMENT ON COLUMN "public"."ujian"."duration_minutes" IS 'Duration of the exam in minutes';



COMMENT ON COLUMN "public"."ujian"."status" IS 'Status of the exam: draft (created but not started), active (currently running), completed (finished)';



CREATE TABLE IF NOT EXISTS "public"."ujian_soal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ujian_id" "uuid" NOT NULL,
    "soal_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "urutan" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."ujian_soal" OWNER TO "postgres";


COMMENT ON TABLE "public"."ujian_soal" IS 'Junction table linking exams with questions';



COMMENT ON COLUMN "public"."ujian_soal"."urutan" IS 'Order of questions in the exam';



CREATE OR REPLACE VIEW "public"."exam_with_teacher_and_questions" AS
 SELECT "u"."id" AS "exam_id",
    "u"."name" AS "exam_name",
    "u"."description",
    "u"."status",
    "u"."start_time",
    "u"."end_time",
    "u"."duration_minutes",
    "p"."full_name" AS "teacher_name",
    "count"("us"."id") AS "total_questions",
    "u"."created_at"
   FROM (("public"."ujian" "u"
     JOIN "public"."profiles" "p" ON (("u"."created_by" = "p"."id")))
     LEFT JOIN "public"."ujian_soal" "us" ON (("u"."id" = "us"."ujian_id")))
  WHERE ("p"."role" = 'guru'::"public"."user_role")
  GROUP BY "u"."id", "u"."name", "u"."description", "u"."status", "u"."start_time", "u"."end_time", "u"."duration_minutes", "p"."full_name", "u"."created_at";


ALTER VIEW "public"."exam_with_teacher_and_questions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."exam_with_teacher_name" AS
 SELECT "u"."id" AS "exam_id",
    "u"."name" AS "exam_name",
    "u"."description",
    "u"."status",
    "u"."start_time",
    "u"."end_time",
    "u"."duration_minutes",
    "p"."full_name" AS "teacher_name",
    "u"."created_at"
   FROM ("public"."ujian" "u"
     JOIN "public"."profiles" "p" ON (("u"."created_by" = "p"."id")))
  WHERE ("p"."role" = 'guru'::"public"."user_role");


ALTER VIEW "public"."exam_with_teacher_name" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jawaban_siswa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ujian_id" "uuid" NOT NULL,
    "soal_id" "uuid" NOT NULL,
    "siswa_id" "uuid" NOT NULL,
    "answer_text" "text" NOT NULL,
    "score" numeric(5,2),
    "ai_feedback" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."jawaban_siswa" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kelas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nama_kelas" character varying(255) NOT NULL,
    "deskripsi" "text",
    "kode_kelas" character varying(12) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."kelas" OWNER TO "postgres";


COMMENT ON TABLE "public"."kelas" IS 'Table untuk menyimpan kelas virtual yang dibuat oleh guru';



COMMENT ON COLUMN "public"."kelas"."nama_kelas" IS 'Nama kelas seperti "Fisika - Kelas 10-A"';



COMMENT ON COLUMN "public"."kelas"."deskripsi" IS 'Deskripsi opsional kelas';



COMMENT ON COLUMN "public"."kelas"."kode_kelas" IS 'Kode unik kelas dengan format xxx-xxx-xxx untuk siswa bergabung';



COMMENT ON COLUMN "public"."kelas"."created_by" IS 'ID guru yang membuat kelas ini';



CREATE TABLE IF NOT EXISTS "public"."kelas_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kelas_id" "uuid" NOT NULL,
    "siswa_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."kelas_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."kelas_members" IS 'Junction table untuk relasi siswa dengan kelas';



COMMENT ON COLUMN "public"."kelas_members"."kelas_id" IS 'ID kelas yang diikuti siswa';



COMMENT ON COLUMN "public"."kelas_members"."siswa_id" IS 'ID siswa yang bergabung ke kelas';



COMMENT ON COLUMN "public"."kelas_members"."joined_at" IS 'Waktu siswa bergabung ke kelas';



CREATE OR REPLACE VIEW "public"."kelas_members_detail" AS
 SELECT "km"."id",
    "km"."kelas_id",
    "km"."siswa_id",
    "km"."joined_at",
    "k"."nama_kelas",
    "k"."kode_kelas",
    "ps"."full_name" AS "siswa_name",
    "ps"."email" AS "siswa_email",
    "pg"."full_name" AS "guru_name"
   FROM ((("public"."kelas_members" "km"
     JOIN "public"."kelas" "k" ON (("km"."kelas_id" = "k"."id")))
     JOIN "public"."profiles" "ps" ON (("km"."siswa_id" = "ps"."id")))
     JOIN "public"."profiles" "pg" ON (("k"."created_by" = "pg"."id")));


ALTER VIEW "public"."kelas_members_detail" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kelas_with_member_count" AS
 SELECT "k"."id",
    "k"."nama_kelas",
    "k"."deskripsi",
    "k"."kode_kelas",
    "k"."created_by",
    "k"."created_at",
    "k"."updated_at",
    COALESCE("count"("km"."siswa_id"), (0)::bigint) AS "jumlah_siswa",
    "p"."full_name" AS "guru_name"
   FROM (("public"."kelas" "k"
     LEFT JOIN "public"."kelas_members" "km" ON (("k"."id" = "km"."kelas_id")))
     LEFT JOIN "public"."profiles" "p" ON (("k"."created_by" = "p"."id")))
  GROUP BY "k"."id", "k"."nama_kelas", "k"."deskripsi", "k"."kode_kelas", "k"."created_by", "k"."created_at", "k"."updated_at", "p"."full_name";


ALTER VIEW "public"."kelas_with_member_count" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."soal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" character varying(20) DEFAULT 'essay'::character varying,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "difficulty_level" character varying(10) DEFAULT 'medium'::character varying,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "options" "jsonb",
    "correct_answer" "text",
    CONSTRAINT "soal_difficulty_level_check" CHECK ((("difficulty_level")::"text" = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::"text"[]))),
    CONSTRAINT "soal_question_type_check" CHECK ((("question_type")::"text" = ANY ((ARRAY['essay'::character varying, 'multiple_choice'::character varying])::"text"[])))
);


ALTER TABLE "public"."soal" OWNER TO "postgres";


COMMENT ON COLUMN "public"."soal"."options" IS 'Array of options for multiple choice questions, format: [{"id": "A", "text": "Option A"}, {"id": "B", "text": "Option B"}]';



COMMENT ON COLUMN "public"."soal"."correct_answer" IS 'For multiple_choice: stores the correct option ID. For essay: stores optional reference answer to guide AI grading';



CREATE TABLE IF NOT EXISTS "public"."ujian_siswa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ujian_id" "uuid",
    "siswa_id" "uuid",
    "status" "text" DEFAULT 'in_progress'::"text",
    "started_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    CONSTRAINT "ujian_siswa_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."ujian_siswa" OWNER TO "postgres";


ALTER TABLE ONLY "public"."jawaban_siswa"
    ADD CONSTRAINT "jawaban_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kelas"
    ADD CONSTRAINT "kelas_kode_kelas_key" UNIQUE ("kode_kelas");



ALTER TABLE ONLY "public"."kelas_members"
    ADD CONSTRAINT "kelas_members_kelas_id_siswa_id_key" UNIQUE ("kelas_id", "siswa_id");



ALTER TABLE ONLY "public"."kelas_members"
    ADD CONSTRAINT "kelas_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kelas"
    ADD CONSTRAINT "kelas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."soal"
    ADD CONSTRAINT "soal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ujian"
    ADD CONSTRAINT "ujian_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ujian_siswa"
    ADD CONSTRAINT "ujian_siswa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ujian_soal"
    ADD CONSTRAINT "ujian_soal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ujian_soal"
    ADD CONSTRAINT "ujian_soal_ujian_id_soal_id_key" UNIQUE ("ujian_id", "soal_id");



ALTER TABLE ONLY "public"."ujian_siswa"
    ADD CONSTRAINT "unique_ujian_siswa" UNIQUE ("ujian_id", "siswa_id");



CREATE INDEX "idx_jawaban_siswa_id" ON "public"."jawaban_siswa" USING "btree" ("siswa_id");



CREATE INDEX "idx_jawaban_soal_id" ON "public"."jawaban_siswa" USING "btree" ("soal_id");



CREATE INDEX "idx_jawaban_ujian_id" ON "public"."jawaban_siswa" USING "btree" ("ujian_id");



CREATE INDEX "idx_kelas_created_at" ON "public"."kelas" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_kelas_created_by" ON "public"."kelas" USING "btree" ("created_by");



CREATE INDEX "idx_kelas_kode_kelas" ON "public"."kelas" USING "btree" ("kode_kelas");



CREATE INDEX "idx_kelas_members_joined_at" ON "public"."kelas_members" USING "btree" ("joined_at" DESC);



CREATE INDEX "idx_kelas_members_kelas_id" ON "public"."kelas_members" USING "btree" ("kelas_id");



CREATE INDEX "idx_kelas_members_siswa_id" ON "public"."kelas_members" USING "btree" ("siswa_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_soal_created_at" ON "public"."soal" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_soal_created_by" ON "public"."soal" USING "btree" ("created_by");



CREATE INDEX "idx_soal_difficulty" ON "public"."soal" USING "btree" ("difficulty_level");



CREATE INDEX "idx_soal_essay_reference" ON "public"."soal" USING "btree" ("question_type", "correct_answer") WHERE ((("question_type")::"text" = 'essay'::"text") AND ("correct_answer" IS NOT NULL));



CREATE INDEX "idx_soal_tags" ON "public"."soal" USING "gin" ("tags");



CREATE INDEX "idx_soal_type" ON "public"."soal" USING "btree" ("question_type");



CREATE INDEX "idx_ujian_created_by" ON "public"."ujian" USING "btree" ("created_by");



CREATE INDEX "idx_ujian_kelas_id" ON "public"."ujian" USING "btree" ("kelas_id");



CREATE INDEX "idx_ujian_soal_soal_id" ON "public"."ujian_soal" USING "btree" ("soal_id");



CREATE INDEX "idx_ujian_soal_ujian_id" ON "public"."ujian_soal" USING "btree" ("ujian_id");



CREATE INDEX "idx_ujian_start_time" ON "public"."ujian" USING "btree" ("start_time");



CREATE INDEX "idx_ujian_time" ON "public"."ujian" USING "btree" ("start_time", "end_time");



CREATE OR REPLACE TRIGGER "auto_generate_kode_kelas" BEFORE INSERT ON "public"."kelas" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_generate_kode_kelas"();



CREATE OR REPLACE TRIGGER "set_jawaban_updated_at" BEFORE UPDATE ON "public"."jawaban_siswa" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_kelas_updated_at" BEFORE UPDATE ON "public"."kelas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_soal_updated_at" BEFORE UPDATE ON "public"."soal" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ujian_updated_at" BEFORE UPDATE ON "public"."ujian" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ujian_soal"
    ADD CONSTRAINT "fk_ujian_soal_soal_id" FOREIGN KEY ("soal_id") REFERENCES "public"."soal"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jawaban_siswa"
    ADD CONSTRAINT "jawaban_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jawaban_siswa"
    ADD CONSTRAINT "jawaban_soal_id_fkey" FOREIGN KEY ("soal_id") REFERENCES "public"."soal"("id");



ALTER TABLE ONLY "public"."jawaban_siswa"
    ADD CONSTRAINT "jawaban_ujian_id_fkey" FOREIGN KEY ("ujian_id") REFERENCES "public"."ujian"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kelas"
    ADD CONSTRAINT "kelas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kelas_members"
    ADD CONSTRAINT "kelas_members_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kelas_members"
    ADD CONSTRAINT "kelas_members_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."soal"
    ADD CONSTRAINT "soal_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ujian"
    ADD CONSTRAINT "ujian_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ujian"
    ADD CONSTRAINT "ujian_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ujian_siswa"
    ADD CONSTRAINT "ujian_siswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ujian_siswa"
    ADD CONSTRAINT "ujian_siswa_ujian_id_fkey" FOREIGN KEY ("ujian_id") REFERENCES "public"."ujian"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ujian_soal"
    ADD CONSTRAINT "ujian_soal_ujian_id_fkey" FOREIGN KEY ("ujian_id") REFERENCES "public"."ujian"("id") ON DELETE CASCADE;



CREATE POLICY "Enable insert for service role" ON "public"."profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "Guru can delete own soal" ON "public"."soal" FOR DELETE USING ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'guru'::"public"."user_role"))))));



CREATE POLICY "Guru can insert soal" ON "public"."soal" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'guru'::"public"."user_role"))))));



CREATE POLICY "Guru can manage own ujian" ON "public"."ujian" USING ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'guru'::"public"."user_role"))))));



CREATE POLICY "Guru can manage ujian_soal for own ujian" ON "public"."ujian_soal" USING ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "ujian_soal"."ujian_id") AND ("ujian"."created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'guru'::"public"."user_role"))))))));



CREATE POLICY "Guru can update jawaban for own ujian" ON "public"."jawaban_siswa" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "jawaban_siswa"."ujian_id") AND ("ujian"."created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'guru'::"public"."user_role"))))))));



CREATE POLICY "Guru can update own soal" ON "public"."soal" FOR UPDATE USING ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'guru'::"public"."user_role")))))) WITH CHECK ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'guru'::"public"."user_role"))))));



CREATE POLICY "Guru can view jawaban for own ujian" ON "public"."jawaban_siswa" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "jawaban_siswa"."ujian_id") AND ("ujian"."created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'guru'::"public"."user_role"))))))));



CREATE POLICY "Guru can view own soal" ON "public"."soal" FOR SELECT USING ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'guru'::"public"."user_role"))))));



CREATE POLICY "Siswa bisa baca soal yang dia jawab" ON "public"."soal" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jawaban_siswa"
  WHERE (("jawaban_siswa"."soal_id" = "soal"."id") AND ("jawaban_siswa"."siswa_id" = "auth"."uid"())))));



CREATE POLICY "Siswa can insert own jawaban" ON "public"."jawaban_siswa" FOR INSERT WITH CHECK ((("auth"."uid"() = "siswa_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'siswa'::"public"."user_role")))) AND (EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "jawaban_siswa"."ujian_id") AND ("now"() >= "ujian"."start_time") AND ("now"() <= "ujian"."end_time"))))));



CREATE POLICY "Siswa can view own jawaban" ON "public"."jawaban_siswa" FOR SELECT USING ((("auth"."uid"() = "siswa_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'siswa'::"public"."user_role"))))));



CREATE POLICY "Siswa can view soal in active ujian" ON "public"."soal" FOR SELECT TO "authenticated" USING (((( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'siswa'::"public"."user_role"))) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."ujian_soal" "us"
     JOIN "public"."ujian" "u" ON (("u"."id" = "us"."ujian_id")))
  WHERE (("us"."soal_id" = "soal"."id") AND ("u"."status" = 'active'::"public"."ujian_status") AND ("u"."start_time" <= "now"()) AND ("u"."end_time" >= "now"()))))));



CREATE POLICY "Siswa can view ujian" ON "public"."ujian" FOR SELECT USING ((( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'siswa'::"public"."user_role"))) IS NOT NULL));



CREATE POLICY "Siswa can view ujian in joined kelas" ON "public"."ujian" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'siswa'::"public"."user_role")))) AND (("kelas_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."kelas_members"
  WHERE (("kelas_members"."kelas_id" = "ujian"."kelas_id") AND ("kelas_members"."siswa_id" = "auth"."uid"())))))));



CREATE POLICY "Siswa can view ujian_soal for active ujian" ON "public"."ujian_soal" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "ujian_soal"."ujian_id") AND ("now"() >= "ujian"."start_time") AND ("now"() <= "ujian"."end_time") AND (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'siswa'::"public"."user_role"))))))));



CREATE POLICY "Siswa can view ujian_soal in active ujian" ON "public"."ujian_soal" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ujian" "u"
  WHERE (("u"."id" = "ujian_soal"."ujian_id") AND ("u"."status" = 'active'::"public"."ujian_status") AND ("u"."start_time" IS NOT NULL) AND ("u"."end_time" IS NOT NULL) AND ("now"() >= "u"."start_time") AND ("now"() <= "u"."end_time")))));



CREATE POLICY "Students can insert their own answers" ON "public"."jawaban_siswa" FOR INSERT WITH CHECK (("auth"."uid"() = "siswa_id"));



CREATE POLICY "Students can view their own answers" ON "public"."jawaban_siswa" FOR SELECT USING (("auth"."uid"() = "siswa_id"));



CREATE POLICY "Teachers can update scores for their exams" ON "public"."jawaban_siswa" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "jawaban_siswa"."ujian_id") AND ("ujian"."created_by" = "auth"."uid"())))));



CREATE POLICY "Teachers can view answers for their exams" ON "public"."jawaban_siswa" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "jawaban_siswa"."ujian_id") AND ("ujian"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own soal" ON "public"."soal" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own ujian" ON "public"."ujian" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own ujian_soal" ON "public"."ujian_soal" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "ujian_soal"."ujian_id") AND ("ujian"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert profile" ON "public"."profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert their own soal" ON "public"."soal" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own ujian" ON "public"."ujian" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own ujian_soal" ON "public"."ujian_soal" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "ujian_soal"."ujian_id") AND ("ujian"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own soal" ON "public"."soal" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own ujian" ON "public"."ujian" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own ujian_soal" ON "public"."ujian_soal" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "ujian_soal"."ujian_id") AND ("ujian"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view their own ujian" ON "public"."ujian" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view their own ujian_soal" ON "public"."ujian_soal" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ujian"
  WHERE (("ujian"."id" = "ujian_soal"."ujian_id") AND ("ujian"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."jawaban_siswa" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kelas_delete_guru" ON "public"."kelas" FOR DELETE USING ((("created_by" = "auth"."uid"()) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'guru'::"public"."user_role")))));



CREATE POLICY "kelas_insert_guru" ON "public"."kelas" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'guru'::"public"."user_role")))));



ALTER TABLE "public"."kelas_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kelas_members_delete_guru" ON "public"."kelas_members" FOR DELETE USING ((("kelas_id" IN ( SELECT "kelas"."id"
   FROM "public"."kelas"
  WHERE ("kelas"."created_by" = "auth"."uid"()))) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'guru'::"public"."user_role")))));



CREATE POLICY "kelas_members_delete_siswa" ON "public"."kelas_members" FOR DELETE USING ((("siswa_id" = "auth"."uid"()) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'siswa'::"public"."user_role")))));



CREATE POLICY "kelas_members_insert_siswa" ON "public"."kelas_members" FOR INSERT WITH CHECK ((("siswa_id" = "auth"."uid"()) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'siswa'::"public"."user_role")))));



CREATE POLICY "kelas_members_select_guru" ON "public"."kelas_members" FOR SELECT USING ((("kelas_id" IN ( SELECT "kelas"."id"
   FROM "public"."kelas"
  WHERE ("kelas"."created_by" = "auth"."uid"()))) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'guru'::"public"."user_role")))));



CREATE POLICY "kelas_members_select_siswa" ON "public"."kelas_members" FOR SELECT USING ((("siswa_id" = "auth"."uid"()) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'siswa'::"public"."user_role")))));



CREATE POLICY "kelas_select_guru" ON "public"."kelas" FOR SELECT USING ((("created_by" = "auth"."uid"()) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'guru'::"public"."user_role")))));



CREATE POLICY "kelas_select_siswa" ON "public"."kelas" FOR SELECT USING ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'siswa'::"public"."user_role"))) AND ("id" IN ( SELECT "kelas_members"."kelas_id"
   FROM "public"."kelas_members"
  WHERE ("kelas_members"."siswa_id" = "auth"."uid"())))));



CREATE POLICY "kelas_update_guru" ON "public"."kelas" FOR UPDATE USING ((("created_by" = "auth"."uid"()) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'guru'::"public"."user_role"))))) WITH CHECK ((("created_by" = "auth"."uid"()) AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'guru'::"public"."user_role")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."soal" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ujian" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ujian_soal" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ujian";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";










GRANT ALL ON FUNCTION "public"."generate_kode_kelas"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_kode_kelas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_kode_kelas"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."join_kelas_by_code"("p_kode_kelas" "text", "p_siswa_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."join_kelas_by_code"("p_kode_kelas" "text", "p_siswa_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_kelas_by_code"("p_kode_kelas" "text", "p_siswa_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_siswa_from_kelas"("p_kelas_id" "uuid", "p_siswa_id" "uuid", "p_guru_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_siswa_from_kelas"("p_kelas_id" "uuid", "p_siswa_id" "uuid", "p_guru_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_siswa_from_kelas"("p_kelas_id" "uuid", "p_siswa_id" "uuid", "p_guru_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_profile_creation"("test_user_id" "uuid", "test_email" "text", "test_full_name" "text", "test_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."test_profile_creation"("test_user_id" "uuid", "test_email" "text", "test_full_name" "text", "test_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_profile_creation"("test_user_id" "uuid", "test_email" "text", "test_full_name" "text", "test_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_generate_kode_kelas"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_generate_kode_kelas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_generate_kode_kelas"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ujian" TO "anon";
GRANT ALL ON TABLE "public"."ujian" TO "authenticated";
GRANT ALL ON TABLE "public"."ujian" TO "service_role";



GRANT ALL ON TABLE "public"."ujian_soal" TO "anon";
GRANT ALL ON TABLE "public"."ujian_soal" TO "authenticated";
GRANT ALL ON TABLE "public"."ujian_soal" TO "service_role";



GRANT ALL ON TABLE "public"."exam_with_teacher_and_questions" TO "anon";
GRANT ALL ON TABLE "public"."exam_with_teacher_and_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_with_teacher_and_questions" TO "service_role";



GRANT ALL ON TABLE "public"."exam_with_teacher_name" TO "anon";
GRANT ALL ON TABLE "public"."exam_with_teacher_name" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_with_teacher_name" TO "service_role";



GRANT ALL ON TABLE "public"."jawaban_siswa" TO "anon";
GRANT ALL ON TABLE "public"."jawaban_siswa" TO "authenticated";
GRANT ALL ON TABLE "public"."jawaban_siswa" TO "service_role";



GRANT ALL ON TABLE "public"."kelas" TO "anon";
GRANT ALL ON TABLE "public"."kelas" TO "authenticated";
GRANT ALL ON TABLE "public"."kelas" TO "service_role";



GRANT ALL ON TABLE "public"."kelas_members" TO "anon";
GRANT ALL ON TABLE "public"."kelas_members" TO "authenticated";
GRANT ALL ON TABLE "public"."kelas_members" TO "service_role";



GRANT ALL ON TABLE "public"."kelas_members_detail" TO "anon";
GRANT ALL ON TABLE "public"."kelas_members_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."kelas_members_detail" TO "service_role";



GRANT ALL ON TABLE "public"."kelas_with_member_count" TO "anon";
GRANT ALL ON TABLE "public"."kelas_with_member_count" TO "authenticated";
GRANT ALL ON TABLE "public"."kelas_with_member_count" TO "service_role";



GRANT ALL ON TABLE "public"."soal" TO "anon";
GRANT ALL ON TABLE "public"."soal" TO "authenticated";
GRANT ALL ON TABLE "public"."soal" TO "service_role";



GRANT ALL ON TABLE "public"."ujian_siswa" TO "anon";
GRANT ALL ON TABLE "public"."ujian_siswa" TO "authenticated";
GRANT ALL ON TABLE "public"."ujian_siswa" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
