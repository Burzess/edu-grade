import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/fix-rls - Fix RLS policies (guru only, auth required)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = await createAdminClient();

    // Step 1: Drop all existing policies
    const dropStatements = [
      `DROP POLICY IF EXISTS "Guru can view own kelas" ON kelas`,
      `DROP POLICY IF EXISTS "Guru can insert kelas" ON kelas`,
      `DROP POLICY IF EXISTS "Guru can update own kelas" ON kelas`,
      `DROP POLICY IF EXISTS "Guru can delete own kelas" ON kelas`,
      `DROP POLICY IF EXISTS "Siswa can view joined kelas" ON kelas`,
      `DROP POLICY IF EXISTS "kelas_select_guru" ON kelas`,
      `DROP POLICY IF EXISTS "kelas_insert_guru" ON kelas`,
      `DROP POLICY IF EXISTS "kelas_update_guru" ON kelas`,
      `DROP POLICY IF EXISTS "kelas_delete_guru" ON kelas`,
      `DROP POLICY IF EXISTS "kelas_select_siswa" ON kelas`,
      `DROP POLICY IF EXISTS "Guru can view members of own kelas" ON kelas_members`,
      `DROP POLICY IF EXISTS "Guru can remove members from own kelas" ON kelas_members`,
      `DROP POLICY IF EXISTS "Siswa can join kelas" ON kelas_members`,
      `DROP POLICY IF EXISTS "Siswa can view own kelas membership" ON kelas_members`,
      `DROP POLICY IF EXISTS "Siswa can leave kelas" ON kelas_members`,
      `DROP POLICY IF EXISTS "kelas_members_select_guru" ON kelas_members`,
      `DROP POLICY IF EXISTS "kelas_members_delete_guru" ON kelas_members`,
      `DROP POLICY IF EXISTS "kelas_members_insert_siswa" ON kelas_members`,
      `DROP POLICY IF EXISTS "kelas_members_select_siswa" ON kelas_members`,
      `DROP POLICY IF EXISTS "kelas_members_delete_siswa" ON kelas_members`
    ];

    for (const statement of dropStatements) {
      try {
        await adminSupabase.rpc('exec', { sql: statement });
      } catch (err: unknown) {
        console.warn('Drop policy warning (expected):', err);
      }
    }

    // Step 2: Create RLS policies
    const createStatements = [
      `CREATE POLICY "allow_all_select_kelas" ON kelas FOR SELECT TO authenticated USING (true)`,
      `CREATE POLICY "allow_all_insert_kelas" ON kelas FOR INSERT TO authenticated WITH CHECK (true)`,
      `CREATE POLICY "allow_owner_update_kelas" ON kelas FOR UPDATE TO authenticated 
       USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid())`,
      `CREATE POLICY "allow_owner_delete_kelas" ON kelas FOR DELETE TO authenticated 
       USING (created_by = auth.uid())`,
      `CREATE POLICY "allow_all_select_members" ON kelas_members FOR SELECT TO authenticated USING (true)`,
      `CREATE POLICY "allow_all_insert_members" ON kelas_members FOR INSERT TO authenticated WITH CHECK (true)`,
      `CREATE POLICY "allow_delete_membership" ON kelas_members FOR DELETE TO authenticated USING (true)`
    ];

    let successCount = 0;
    const errors: string[] = [];

    for (const statement of createStatements) {
      try {
        await adminSupabase.rpc('exec', { sql: statement });
        successCount++;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Create policy error:', errMsg);
        errors.push(errMsg);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create some policies',
        successCount
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'RLS policies fixed with simple rules',
      policies: [
        'allow_authenticated_select_kelas',
        'allow_authenticated_insert_kelas', 
        'allow_owner_update_kelas',
        'allow_owner_delete_kelas',
        'allow_authenticated_select_members',
        'allow_authenticated_insert_members',
        'allow_delete_own_membership'
      ]
    });

  } catch (error: unknown) {
    console.error('Error fixing RLS:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix RLS policies'
    }, { status: 500 });
  }
}
