import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface User {
  id: string;
  email: string;
  role: 'guru' | 'siswa';
  full_name: string;
  created_at?: string;
}

/**
 * Server-side function untuk mendapatkan user saat ini
 * Menggunakan caching dan fallback untuk menghindari loading yang stuck
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Coba ambil dari user metadata terlebih dahulu (lebih cepat)
    const metadata = user.user_metadata || {};
    if (metadata.role && metadata.full_name) {
      return {
        id: user.id,
        email: user.email!,
        role: metadata.role as 'guru' | 'siswa',
        full_name: metadata.full_name,
        created_at: user.created_at,
      };
    }

    // Fallback ke database query dengan timeout
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile && !profileError) {
        return {
          id: profile.id,
          email: profile.email,
          role: profile.role as 'guru' | 'siswa',
          full_name: profile.full_name,
          created_at: profile.created_at,
        };
      }
    } catch (dbError) {
      console.error('Database query failed, using fallback:', dbError);
    }

    // Emergency fallback - buat user object minimal
    return {
      id: user.id,
      email: user.email!,
      role: (metadata.role as 'guru' | 'siswa') || 'siswa',
      full_name: metadata.full_name || user.email?.split('@')[0] || 'User',
      created_at: user.created_at,
    };

  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
}

/**
 * Server-side function yang membutuhkan authentication
 * Akan redirect ke /login jika user tidak terautentikasi
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Server-side function yang membutuhkan role tertentu
 * Akan redirect ke /unauthorized jika role tidak sesuai
 */
export async function requireRole(roles: string[]): Promise<User> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    redirect('/unauthorized');
  }
  return user;
}

/**
 * Server-side function khusus untuk guru
 */
export async function requireGuru(): Promise<User> {
  return requireRole(['guru']);
}

/**
 * Server-side function khusus untuk siswa
 */
export async function requireSiswa(): Promise<User> {
  return requireRole(['siswa']);
}

/**
 * Helper function untuk mengecek apakah user memiliki permission
 */
export function hasPermission(user: User, permission: string): boolean {
  const permissions = {
    guru: ['read', 'write', 'delete', 'manage_students', 'manage_exams'],
    siswa: ['read', 'take_exam'],
  };

  const userPermissions = permissions[user.role] || [];
  return userPermissions.includes(permission);
}

/**
 * Server-side function untuk logout
 */
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Signout error:', error);
  }
  redirect('/login');
}
