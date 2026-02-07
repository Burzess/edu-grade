'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('guru' | 'siswa')[];
  fallbackUrl?: string;
  loadingTimeout?: number;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles,
  fallbackUrl = '/login',
  loadingTimeout = 8000
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Ensure hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth check dengan timeout
  useEffect(() => {
    if (!mounted) return;

    const checkAuthWithTimeout = async () => {
      // Set timeout untuk auth check
      const timeoutId = setTimeout(() => {
        if (!authChecked && loading) {
          console.warn('Auth check timeout, redirecting to login');
          router.replace(fallbackUrl);
        }
      }, loadingTimeout);

      // Tunggu sampai loading selesai atau timeout
      const checkInterval = setInterval(() => {
        if (!loading || (user && profile)) {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          setAuthChecked(true);
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
      };
    };

    checkAuthWithTimeout();
  }, [mounted, loading, user, profile, authChecked, router, fallbackUrl, loadingTimeout]);

  // Redirect logic
  useEffect(() => {
    if (!mounted || !authChecked || loading) return;

    // Jika tidak ada user, redirect ke login
    if (!user || !profile) {
      console.log('No user/profile, redirecting to login');
      router.replace(fallbackUrl);
      return;
    }

    // Jika ada role requirement, check role
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = profile.role as 'guru' | 'siswa';
      
      if (!requiredRoles.includes(userRole)) {
        console.log(`Access denied. Required: ${requiredRoles}, User has: ${userRole}`);
        
        // Redirect ke dashboard sesuai role user
        const redirectPath = userRole === 'guru' ? '/guru/dashboard' : '/siswa/dashboard';
        
        // Jangan redirect jika sudah di path yang benar
        if (pathname !== redirectPath) {
          router.replace(redirectPath);
        }
        return;
      }
    }

    // Auto-redirect dari root ke dashboard yang sesuai
    if (pathname === '/') {
      const userRole = profile.role as 'guru' | 'siswa';
      const dashboardPath = userRole === 'guru' ? '/guru/dashboard' : '/siswa/dashboard';
      router.replace(dashboardPath);
      return;
    }

  }, [mounted, authChecked, loading, user, profile, requiredRoles, pathname, router, fallbackUrl]);

  // Show loading hanya jika belum mounted atau masih loading auth
  if (!mounted || loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Tampilkan spinner minimal saat akan redirect
  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Check role access
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = profile.role as 'guru' | 'siswa';
    
    if (!requiredRoles.includes(userRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
