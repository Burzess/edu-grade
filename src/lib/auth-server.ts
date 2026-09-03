import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface User {
  id: string;
  email: string;
  role: 'guru' | 'siswa' | 'admin';
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

    // Selalu ambil role dari tabel profiles (database) demi keamanan (SECURITY 2.32, 2.33)
    // Jangan pernah mempercayai user_metadata.role yang dapat dimanipulasi klien
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
          role: (['guru', 'siswa', 'admin'].includes(profile.role) ? profile.role : 'siswa') as User['role'],
          full_name: profile.full_name || user.email?.split('@')[0] || 'User',
          created_at: profile.created_at,
        };
      }
    } catch (dbError) {
      logger.error('Database query failed in getCurrentUser:', dbError);
    }

    // Emergency fallback jika database bermasalah - selalu gunakan role siswa (safest default)
    const metadata = user.user_metadata || {};
    return {
      id: user.id,
      email: user.email!,
      role: 'siswa',
      full_name: (metadata.full_name as string) || user.email?.split('@')[0] || 'User',
      created_at: user.created_at,
    };

  } catch (error: unknown) {
    logger.error('getCurrentUser error:', error);
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
export async function requireRole(roles: Array<User['role']>): Promise<User> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    redirect('/unauthorized');
  }
  return user;
}

/**
 * Server-side function khusus untuk admin
 */
export async function requireAdmin(): Promise<User> {
  return requireRole(['admin']);
}
