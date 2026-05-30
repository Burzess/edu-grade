import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase Proxy Handler - Best Practice 2026
 * 
 * File ini menangani refresh session di middleware/proxy.
 * Menggunakan getClaims() untuk validasi JWT yang aman.
 * 
 * PENTING:
 * - Selalu gunakan getClaims() untuk validasi server-side
 * - Jangan trust getSession() karena tidak memvalidasi JWT signature
 * - getClaims() memvalidasi JWT signature terhadap public keys project
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Dengan Fluid compute, jangan simpan client di global variable.
  // Selalu buat client baru di setiap request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // JANGAN jalankan code apapun antara createServerClient dan
  // supabase.auth.getClaims(). Kesalahan kecil bisa menyebabkan
  // user logout secara random.

  // PENTING: Jika Anda menghapus getClaims() dan menggunakan SSR
  // dengan Supabase client, user bisa logout secara random.
  const { data, error } = await supabase.auth.getClaims()

  // Jika tidak ada claims dan bukan route public, redirect ke login
  if (
    error || !data?.claims
  ) {
    // Route public yang tidak perlu autentikasi
    const publicPaths = ['/login', '/auth', '/api/auth']
    const isPublicPath = publicPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )
    
    if (!isPublicPath && !request.nextUrl.pathname.startsWith('/_next')) {
      // No user, redirect ke halaman login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // PENTING: Anda *harus* return supabaseResponse object as-is.
  // Jika Anda membuat response object baru dengan NextResponse.next(), pastikan:
  // 1. Pass request di dalamnya:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy cookies:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Ubah myNewResponse sesuai kebutuhan, tapi jangan ubah cookies!
  // Jika tidak dilakukan, browser dan server bisa out of sync
  // dan session user bisa terminate prematur!

  return supabaseResponse
}
