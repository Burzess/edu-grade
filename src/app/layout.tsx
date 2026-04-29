import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { FloatingThemeToggle } from "@/components/ui/floating-theme-toggle";
import { getCurrentUser } from "@/lib/auth-server";
import ErrorBoundary from "@/components/ui/error-boundary";
import { Toaster } from "react-hot-toast";
import { icons } from "lucide-react";

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
  } catch (error: unknown) {
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
                {/* Toast Notifications */}
                <Toaster
                  position="top-right"
                  reverseOrder={false}
                  gutter={8}
                  containerClassName=""
                  containerStyle={{}}
                  toastOptions={{
                    // Default options for all toasts
                    duration: 4000,
                    style: {
                      background: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      fontSize: '14px',
                      padding: '12px 16px',
                    },
                    // Success toasts
                    success: {
                      style: {
                        background: '#f0fdf4',
                        color: '#16a34a',
                        border: '1px solid #86efac',
                        borderRadius: 'var(--radius)',
                      },
                      iconTheme: {
                        primary: '#16a34a',
                        secondary: 'white',
                      },
                    },
                    // Error toasts
                    error: {
                      style: {
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        borderRadius: 'var(--radius)',
                      },
                      iconTheme: {
                        primary: '#dc2626',
                        secondary: 'white',
                      },
                    },
                    // Loading toasts
                    loading: {
                      style: {
                        background: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      },
                    },
                  }}
                />
                {/* Floating Theme Toggle - Available on all pages */}
                <FloatingThemeToggle position="bottom-right" />
                {/* Auth Debug Panel - Development only */}
                {/* <AuthDebugPanel /> */}
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
