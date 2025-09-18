import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { FloatingThemeToggle } from "@/components/ui/floating-theme-toggle";
import { getCurrentUser } from "@/lib/auth-server";
import ErrorBoundary from "@/components/ui/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Edu-Grade | Sistem Penilaian Otomatis",
  description: "Platform ujian dengan penilaian otomatis menggunakan AI",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side auth check untuk menghindari loading state
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error('Layout auth check failed:', error);
    // Tidak throw error, biarkan client handle auth
  }

  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <AuthProvider initialUser={user}>
                {children}
                {/* Floating Theme Toggle - Available on all pages */}
                <FloatingThemeToggle position="bottom-right" />
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
