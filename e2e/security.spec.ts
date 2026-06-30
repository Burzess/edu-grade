import { test, expect } from '@playwright/test';

test.describe('Security Tests (Blackbox)', () => {

  test('TC-KHD-014: Cek SQL Injection pada Halaman Login', async ({ page }) => {
    // Navigasi ke halaman login
    await page.goto('/login');

    // Coba masukkan payload SQL Injection standar pada field email
    const sqlPayload = "' OR '1'='1";
    await page.fill('input[type="email"]', sqlPayload);
    await page.fill('input[type="password"]', 'sembarangpassword');
    
    // Klik tombol login
    await page.click('button[type="submit"]');

    // Supabase (PostgreSQL) menggunakan parameterized queries sehingga 
    // akan menganggap input di atas sebagai string literal biasa.
    // Verifikasi bahwa login gagal dan sistem menampilkan pesan error kredensial (bukan error database atau berhasil masuk).
    const errorMessage = page.locator('text="Email atau password salah"').or(page.locator('text="Invalid login credentials"'));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Pastikan tidak masuk ke dashboard
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-KHD-015: Cek XSS pada Halaman Login (atau field input publik)', async ({ page }) => {
    await page.goto('/login');

    // Coba masukkan script XSS pada field email
    const xssPayload = "<script>alert('XSS')</script>";
    await page.fill('input[type="email"]', xssPayload);
    await page.fill('input[type="password"]', 'password123');
    
    // Klik tombol login
    await page.click('button[type="submit"]');

    // Cek apakah dialog alert muncul (jika muncul berarti rentan XSS)
    let alertTriggered = false;
    page.on('dialog', dialog => {
      if (dialog.type() === 'alert' && dialog.message() === 'XSS') {
        alertTriggered = true;
      }
      dialog.dismiss();
    });

    // React/Next.js dan Supabase memanajemen escaping secara otomatis
    // Tunggu sejenak dan pastikan alert tidak ter-trigger dan form tetap aman
    await page.waitForTimeout(2000);
    expect(alertTriggered).toBe(false);

    // Pastikan pesan error yang muncul telah me-render teks secara aman tanpa mengeksekusi tag HTML
    const errorMessage = page.locator('text="Email atau password salah"').or(page.locator('text="Invalid login credentials"'));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});
