'use client';
import React, { useEffect, useState } from 'react';

interface LoadingSpinnerProps {
  message?: string;
  timeout?: number;
  showRetry?: boolean;
  onRetry?: () => void;
}

export default function LoadingSpinner({ 
  message = "Memuat...", 
  timeout = 10000,
  showRetry = false,
  onRetry
}: LoadingSpinnerProps) {
  const [isTimeout, setIsTimeout] = useState(false);
  const [dots, setDots] = useState('');

  // Animasi dots untuk loading
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  // Timeout handler
  useEffect(() => {
    if (timeout <= 0) return;

    const timer = setTimeout(() => {
      setIsTimeout(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  if (isTimeout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="bg-card shadow-lg rounded-lg p-8 max-w-md w-full mx-4 border border-border">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Loading Terlalu Lama
            </h3>
            <p className="text-muted-foreground mb-6">
              Sistem membutuhkan waktu lebih lama dari biasanya. Ini mungkin karena koneksi internet yang lambat.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors dark:bg-orange-600 dark:hover:bg-orange-700"
              >
                🔄 Refresh Halaman
              </button>
              
              {showRetry && onRetry && (
                <button 
                  onClick={onRetry}
                  className="w-full bg-muted hover:bg-muted/80 text-muted-foreground font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  🔄 Coba Lagi
                </button>
              )}
              
              <button 
                onClick={() => window.history.back()}
                className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ⬅️ Kembali
              </button>
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              <p>Tips:</p>
              <ul className="text-left mt-2 space-y-1">
                <li>• Pastikan koneksi internet stabil</li>
                <li>• Coba refresh halaman</li>
                <li>• Tutup tab lain yang tidak perlu</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="bg-card shadow-lg rounded-lg p-8 max-w-sm w-full mx-4 border border-border">
        <div className="text-center">
          {/* Spinner dengan animasi yang smooth */}
          <div className="relative inline-flex">
            <div className="w-12 h-12 border-4 border-muted rounded-full animate-spin border-t-orange-500"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-pulse border-t-orange-300"></div>
          </div>
          
          <p className="mt-4 text-orange-600 font-medium">
            {message}{dots}
          </p>
          
          <div className="mt-2 text-xs text-muted-foreground">
            Mohon tunggu sebentar...
          </div>

          {/* Progress bar visual */}
          <div className="mt-4 w-full bg-muted rounded-full h-1">
            <div 
              className="bg-orange-500 h-1 rounded-full animate-pulse"
              style={{ width: '60%' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
