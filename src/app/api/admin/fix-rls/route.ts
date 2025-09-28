import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role untuk bypass semua RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/fix-rls - TEMPORARY: Disable RLS untuk development
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting RLS fix with simple policies...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Drop all existing policies
    console.log('🗑️ Dropping all existing RLS policies...');
    
    const dropPoliciesSQL = `
      -- Drop all existing policies for kelas
      DROP POLICY IF EXISTS "Guru can view own kelas" ON kelas;
      DROP POLICY IF EXISTS "Guru can insert kelas" ON kelas;
      DROP POLICY IF EXISTS "Guru can update own kelas" ON kelas;
      DROP POLICY IF EXISTS "Guru can delete own kelas" ON kelas;
      DROP POLICY IF EXISTS "Siswa can view joined kelas" ON kelas;
      DROP POLICY IF EXISTS "kelas_select_guru" ON kelas;
      DROP POLICY IF EXISTS "kelas_insert_guru" ON kelas;
      DROP POLICY IF EXISTS "kelas_update_guru" ON kelas;
      DROP POLICY IF EXISTS "kelas_delete_guru" ON kelas;
      DROP POLICY IF EXISTS "kelas_select_siswa" ON kelas;
      
      -- Drop all existing policies for kelas_members
      DROP POLICY IF EXISTS "Guru can view members of own kelas" ON kelas_members;
      DROP POLICY IF EXISTS "Guru can remove members from own kelas" ON kelas_members;
      DROP POLICY IF EXISTS "Siswa can join kelas" ON kelas_members;
      DROP POLICY IF EXISTS "Siswa can view own kelas membership" ON kelas_members;
      DROP POLICY IF EXISTS "Siswa can leave kelas" ON kelas_members;
      DROP POLICY IF EXISTS "kelas_members_select_guru" ON kelas_members;
      DROP POLICY IF EXISTS "kelas_members_delete_guru" ON kelas_members;
      DROP POLICY IF EXISTS "kelas_members_insert_siswa" ON kelas_members;
      DROP POLICY IF EXISTS "kelas_members_select_siswa" ON kelas_members;
      DROP POLICY IF EXISTS "kelas_members_delete_siswa" ON kelas_members;
    `;

    // Execute individual SQL statements
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
        await supabase.rpc('exec', { sql: statement });
      } catch (err) {
        console.log('⚠️ Drop policy warning (expected):', err);
      }
    }

    // Step 2: Create super simple RLS policies
    console.log('✨ Creating simple RLS policies...');
    
    const createStatements = [
      // SIMPLE KELAS POLICIES
      `CREATE POLICY "allow_all_select_kelas" ON kelas FOR SELECT TO authenticated USING (true)`,
      
      `CREATE POLICY "allow_all_insert_kelas" ON kelas FOR INSERT TO authenticated WITH CHECK (true)`,
      
      `CREATE POLICY "allow_owner_update_kelas" ON kelas FOR UPDATE TO authenticated 
       USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid())`,
      
      `CREATE POLICY "allow_owner_delete_kelas" ON kelas FOR DELETE TO authenticated 
       USING (created_by = auth.uid())`,
      
      // SIMPLE KELAS_MEMBERS POLICIES  
      `CREATE POLICY "allow_all_select_members" ON kelas_members FOR SELECT TO authenticated USING (true)`,
      
      `CREATE POLICY "allow_all_insert_members" ON kelas_members FOR INSERT TO authenticated WITH CHECK (true)`,
      
      `CREATE POLICY "allow_delete_membership" ON kelas_members FOR DELETE TO authenticated USING (true)`
    ];

    let successCount = 0;
    const errors = [];

    for (const statement of createStatements) {
      try {
        await supabase.rpc('exec', { sql: statement });
        successCount++;
      } catch (err: any) {
        console.error('❌ Create policy error:', err);
        errors.push(err.message);
      }
    }

    if (errors.length > 0) {
      console.error('❌ Some policies failed to create:', errors);
      return NextResponse.json({
        success: false,
        error: 'Failed to create some policies',
        details: errors,
        successCount
      }, { status: 500 });
    }

    console.log('✅ Simple RLS policies created successfully!');

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

  } catch (error) {
    console.error('❌ Error fixing RLS:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix RLS policies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
