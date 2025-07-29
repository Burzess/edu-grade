-- Phase 3: Schema Update untuk Ujian (Safe Migration)

-- Function untuk mengecek apakah kolom sudah ada
CREATE OR REPLACE FUNCTION column_exists(tbl_name text, col_name text) 
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = tbl_name 
        AND column_name = col_name
    );
END;
$$ LANGUAGE plpgsql;

-- Function untuk mengecek apakah constraint sudah ada
CREATE OR REPLACE FUNCTION constraint_exists(tbl_name text, constr_name text) 
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = tbl_name 
        AND constraint_name = constr_name
    );
END;
$$ LANGUAGE plpgsql;

-- Buat tabel ujian jika belum ada
CREATE TABLE IF NOT EXISTS ujian (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY
);

-- Tambah kolom satu per satu jika belum ada
DO $$
BEGIN
    -- Kolom name
    IF NOT column_exists('ujian', 'name') THEN
        ALTER TABLE ujian ADD COLUMN name VARCHAR(255);
        UPDATE ujian SET name = 'Untitled Exam' WHERE name IS NULL;
        ALTER TABLE ujian ALTER COLUMN name SET NOT NULL;
    END IF;
    
    -- Kolom description
    IF NOT column_exists('ujian', 'description') THEN
        ALTER TABLE ujian ADD COLUMN description TEXT;
    END IF;
    
    -- Kolom start_time
    IF NOT column_exists('ujian', 'start_time') THEN
        ALTER TABLE ujian ADD COLUMN start_time TIMESTAMPTZ;
        UPDATE ujian SET start_time = NOW() WHERE start_time IS NULL;
        ALTER TABLE ujian ALTER COLUMN start_time SET NOT NULL;
    END IF;
    
    -- Kolom end_time
    IF NOT column_exists('ujian', 'end_time') THEN
        ALTER TABLE ujian ADD COLUMN end_time TIMESTAMPTZ;
        UPDATE ujian SET end_time = NOW() + INTERVAL '1 hour' WHERE end_time IS NULL;
        ALTER TABLE ujian ALTER COLUMN end_time SET NOT NULL;
    END IF;
    
    -- Kolom created_by
    IF NOT column_exists('ujian', 'created_by') THEN
        ALTER TABLE ujian ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        -- Jika ada data existing, update dengan user pertama yang ada
        IF EXISTS (SELECT 1 FROM ujian) AND EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
            UPDATE ujian SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
        END IF;
        -- Set NOT NULL hanya jika tidak ada data existing atau semua sudah memiliki created_by
        IF NOT EXISTS (SELECT 1 FROM ujian WHERE created_by IS NULL) THEN
            ALTER TABLE ujian ALTER COLUMN created_by SET NOT NULL;
        END IF;
    END IF;
    
    -- Kolom created_at
    IF NOT column_exists('ujian', 'created_at') THEN
        ALTER TABLE ujian ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Kolom updated_at
    IF NOT column_exists('ujian', 'updated_at') THEN
        ALTER TABLE ujian ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Tambah constraint time range jika belum ada
DO $$
BEGIN
    IF NOT constraint_exists('ujian', 'valid_time_range') THEN
        -- Update existing data to ensure constraint will be satisfied
        UPDATE ujian SET end_time = start_time + INTERVAL '1 hour' WHERE start_time >= end_time;
        ALTER TABLE ujian ADD CONSTRAINT valid_time_range CHECK (start_time < end_time);
    END IF;
END $$;

-- Buat tabel ujian_soal jika belum ada
CREATE TABLE IF NOT EXISTS ujian_soal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY
);

-- Tambah kolom ujian_soal satu per satu jika belum ada
DO $$
BEGIN
    -- Kolom ujian_id
    IF NOT column_exists('ujian_soal', 'ujian_id') THEN
        ALTER TABLE ujian_soal ADD COLUMN ujian_id UUID REFERENCES ujian(id) ON DELETE CASCADE;
    END IF;
    
    -- Kolom soal_id
    IF NOT column_exists('ujian_soal', 'soal_id') THEN
        -- Cek apakah tabel soal sudah ada
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soal' AND table_schema = 'public') THEN
            ALTER TABLE ujian_soal ADD COLUMN soal_id UUID REFERENCES soal(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added soal_id column with foreign key constraint to soal table';
        ELSE
            RAISE NOTICE 'Warning: Table soal does not exist. Adding soal_id without foreign key constraint.';
            ALTER TABLE ujian_soal ADD COLUMN soal_id UUID;
        END IF;
    ELSE
        -- Jika kolom sudah ada, cek apakah foreign key constraint sudah ada
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.referential_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'ujian_soal' 
            AND referenced_table_name = 'soal'
        ) AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soal' AND table_schema = 'public') THEN
            -- Tambah foreign key constraint jika belum ada
            ALTER TABLE ujian_soal ADD CONSTRAINT fk_ujian_soal_soal_id FOREIGN KEY (soal_id) REFERENCES soal(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint between ujian_soal.soal_id and soal.id';
        END IF;
    END IF;
    
    -- Kolom urutan
    IF NOT column_exists('ujian_soal', 'urutan') THEN
        ALTER TABLE ujian_soal ADD COLUMN urutan INTEGER NOT NULL DEFAULT 1;
    END IF;
    
    -- Kolom created_at
    IF NOT column_exists('ujian_soal', 'created_at') THEN
        ALTER TABLE ujian_soal ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Tambah unique constraint untuk ujian_soal jika belum ada
DO $$
BEGIN
    IF NOT constraint_exists('ujian_soal', 'ujian_soal_ujian_id_soal_id_key') THEN
        -- Remove duplicate rows first if any exist
        DELETE FROM ujian_soal a USING ujian_soal b 
        WHERE a.id > b.id AND a.ujian_id = b.ujian_id AND a.soal_id = b.soal_id;
        
        ALTER TABLE ujian_soal ADD CONSTRAINT ujian_soal_ujian_id_soal_id_key UNIQUE(ujian_id, soal_id);
    END IF;
END $$;

-- Index untuk performance (hanya buat jika belum ada)
DO $$
BEGIN
    -- Index untuk ujian.created_by
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ujian_created_by') THEN
        CREATE INDEX idx_ujian_created_by ON ujian(created_by);
    END IF;
    
    -- Index untuk ujian.start_time
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ujian_start_time') THEN
        CREATE INDEX idx_ujian_start_time ON ujian(start_time);
    END IF;
    
    -- Index untuk ujian_soal.ujian_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ujian_soal_ujian_id') THEN
        CREATE INDEX idx_ujian_soal_ujian_id ON ujian_soal(ujian_id);
    END IF;
    
    -- Index untuk ujian_soal.soal_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ujian_soal_soal_id') THEN
        CREATE INDEX idx_ujian_soal_soal_id ON ujian_soal(soal_id);
    END IF;
END $$;

-- Function dan Trigger untuk update updated_at
DO $$
BEGIN
    -- Hapus trigger lama jika ada
    DROP TRIGGER IF EXISTS update_ujian_updated_at ON ujian;
    
    -- Buat atau replace function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    -- Buat trigger baru
    CREATE TRIGGER update_ujian_updated_at 
        BEFORE UPDATE ON ujian 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Enable RLS untuk ujian jika belum enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'ujian' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE ujian ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- RLS Policies untuk ujian (drop dan create ulang untuk memastikan konsistensi)
DO $$
BEGIN
    -- Drop existing policies jika ada
    DROP POLICY IF EXISTS "Users can view their own ujian" ON ujian;
    DROP POLICY IF EXISTS "Users can insert their own ujian" ON ujian;
    DROP POLICY IF EXISTS "Users can update their own ujian" ON ujian;
    DROP POLICY IF EXISTS "Users can delete their own ujian" ON ujian;
    
    -- Create policies
    CREATE POLICY "Users can view their own ujian" ON ujian
        FOR SELECT USING (auth.uid() = created_by);
        
    CREATE POLICY "Users can insert their own ujian" ON ujian
        FOR INSERT WITH CHECK (auth.uid() = created_by);
        
    CREATE POLICY "Users can update their own ujian" ON ujian
        FOR UPDATE USING (auth.uid() = created_by);
        
    CREATE POLICY "Users can delete their own ujian" ON ujian
        FOR DELETE USING (auth.uid() = created_by);
END $$;

-- Enable RLS untuk ujian_soal jika belum enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'ujian_soal' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE ujian_soal ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- RLS Policies untuk ujian_soal (drop dan create ulang untuk memastikan konsistensi)
DO $$
BEGIN
    -- Drop existing policies jika ada
    DROP POLICY IF EXISTS "Users can view their own ujian_soal" ON ujian_soal;
    DROP POLICY IF EXISTS "Users can insert their own ujian_soal" ON ujian_soal;
    DROP POLICY IF EXISTS "Users can update their own ujian_soal" ON ujian_soal;
    DROP POLICY IF EXISTS "Users can delete their own ujian_soal" ON ujian_soal;
    
    -- Create policies
    CREATE POLICY "Users can view their own ujian_soal" ON ujian_soal
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM ujian 
                WHERE ujian.id = ujian_soal.ujian_id 
                AND ujian.created_by = auth.uid()
            )
        );
        
    CREATE POLICY "Users can insert their own ujian_soal" ON ujian_soal
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM ujian 
                WHERE ujian.id = ujian_soal.ujian_id 
                AND ujian.created_by = auth.uid()
            )
        );
        
    CREATE POLICY "Users can update their own ujian_soal" ON ujian_soal
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM ujian 
                WHERE ujian.id = ujian_soal.ujian_id 
                AND ujian.created_by = auth.uid()
            )
        );
        
    CREATE POLICY "Users can delete their own ujian_soal" ON ujian_soal
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM ujian 
                WHERE ujian.id = ujian_soal.ujian_id 
                AND ujian.created_by = auth.uid()
            )
        );
END $$;

-- Cleanup: Drop helper functions yang tidak diperlukan lagi
DROP FUNCTION IF EXISTS column_exists(text, text);
DROP FUNCTION IF EXISTS constraint_exists(text, text);

-- Refresh PostgREST schema cache untuk memastikan relationship terdeteksi
NOTIFY pgrst, 'reload schema';

-- Comments untuk dokumentasi
COMMENT ON TABLE ujian IS 'Table for storing exam information created by teachers';
COMMENT ON TABLE ujian_soal IS 'Junction table linking exams with questions';
COMMENT ON COLUMN ujian.name IS 'Name/title of the exam';
COMMENT ON COLUMN ujian.description IS 'Optional description of the exam';
COMMENT ON COLUMN ujian.start_time IS 'When the exam becomes available for students';
COMMENT ON COLUMN ujian.end_time IS 'When the exam is no longer available';
COMMENT ON COLUMN ujian_soal.urutan IS 'Order of questions in the exam';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 3 ujian schema migration completed successfully!';
    RAISE NOTICE 'Tables updated: ujian, ujian_soal';
    RAISE NOTICE 'Indexes created, RLS policies updated, triggers configured';
END $$;
