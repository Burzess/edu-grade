-- Migrate ownership of existing kelas and ujian from Guru to Admin

DO $$
DECLARE
    first_admin_id UUID;
BEGIN
    -- Dapatkan ID admin pertama yang ada di database
    SELECT id INTO first_admin_id
    FROM public.profiles
    WHERE role = 'admin'
    LIMIT 1;

    -- Jika ditemukan admin, ubah kepemilikan
    IF first_admin_id IS NOT NULL THEN
        -- 1. Reassign data kelas yang dibuat oleh guru ke admin
        UPDATE public.kelas
        SET created_by = first_admin_id
        WHERE created_by IN (
            SELECT id FROM public.profiles WHERE role = 'guru'
        );

        -- 2. Reassign data ujian yang dibuat oleh guru ke admin
        UPDATE public.ujian
        SET created_by = first_admin_id
        WHERE created_by IN (
            SELECT id FROM public.profiles WHERE role = 'guru'
        );
    END IF;
END $$;
