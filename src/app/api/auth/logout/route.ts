import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

// Menggunakan GET untuk logout agar bisa diakses via Link
export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    await supabase.auth.signOut()
    // Revalidate semua path untuk membersihkan cache yang mungkin masih menyimpan data user
    revalidatePath('/', 'layout')
  }

  // Redirect ke halaman login setelah logout berhasil
  // Pastikan URL absolut, terutama di production
  const redirectUrl = req.nextUrl.clone()
  redirectUrl.pathname = '/login'
  redirectUrl.search = '' // Hapus query params jika ada

  return NextResponse.redirect(redirectUrl)
}
