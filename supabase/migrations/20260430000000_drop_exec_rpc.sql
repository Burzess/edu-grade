-- Drop the exec(sql text) RPC function that allowed arbitrary SQL execution.
-- This function was used by the now-deleted /api/admin/fix-rls route to run
-- raw DDL (DROP POLICY / CREATE POLICY) via a service-role client.
-- All administrative DDL is now managed exclusively through versioned migrations.
--
-- Validates: Requirement 2.34
-- Preservation: 3.9, 3.10 — schema and RLS outcomes unchanged

DROP FUNCTION IF EXISTS public.exec(text);
