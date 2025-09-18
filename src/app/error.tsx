"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, RefreshCw, AlertTriangle, Settings, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Log error untuk debugging
    console.error('Application Error:', error);
  }, [error]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold">Terjadi Kesalahan</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="w-full shadow-lg border-destructive/20">
            <CardHeader className="space-y-6">
              {/* Animated Error Icon */}
              <motion.div 
                className="flex justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.2,
                  type: "spring",
                  bounce: 0.4
                }}
              >
                <div className="p-6 rounded-full bg-destructive/10 border-2 border-destructive/20">
                  <motion.div
                    animate={{ 
                      rotate: [0, -5, 5, -5, 0],
                      scale: [1, 1.1, 1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  >
                    <AlertTriangle className="h-16 w-16 text-destructive" />
                  </motion.div>
                </div>
              </motion.div>
              
              {/* Error Code */}
              <motion.div 
                className="flex justify-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="text-6xl md:text-7xl font-bold text-destructive">
                  500
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
                  Terjadi Kesalahan Server
                </CardTitle>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <CardDescription className="text-base text-muted-foreground max-w-md mx-auto">
                  Maaf, terjadi kesalahan pada server Edu-Grade. 
                  Tim teknis kami sedang menangani masalah ini. 
                  Silakan coba lagi dalam beberapa saat.
                </CardDescription>
              </motion.div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Action Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={reset}
                    size="lg" 
                    className="gap-2 shadow-md"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Coba Lagi
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild variant="outline" size="lg" className="gap-2">
                    <Link href="/">
                      <Home className="h-4 w-4" />
                      Kembali ke Beranda
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>

              {/* Error Details (Development Mode) */}
              {process.env.NODE_ENV === 'development' && error && (
                <motion.div 
                  className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-left"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                >
                  <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Detail Error (Development Mode):
                  </h4>
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-32 bg-muted/50 p-2 rounded">
                    {error.message}
                    {error.digest && `\nDigest: ${error.digest}`}
                  </pre>
                </motion.div>
              )}

              {/* Help Section */}
              <motion.div 
                className="border-t pt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.4 }}
              >
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center justify-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Langkah Pemecahan Masalah
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <motion.div 
                    className="space-y-3 p-4 rounded-lg bg-muted/30"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h4 className="font-medium text-foreground">🔄 Langkah Cepat:</h4>
                    <ul className="text-muted-foreground space-y-1.5">
                      <li>• Refresh halaman (F5)</li>
                      <li>• Tunggu 1-2 menit</li>
                      <li>• Periksa koneksi internet</li>
                      <li>• Coba browser lain</li>
                    </ul>
                  </motion.div>
                  <motion.div 
                    className="space-y-3 p-4 rounded-lg bg-muted/30"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h4 className="font-medium text-foreground">🆘 Jika Masih Bermasalah:</h4>
                    <ul className="text-muted-foreground space-y-1.5">
                      <li>• Hubungi administrator</li>
                      <li>• Laporan bug ke IT</li>
                      <li>• Gunakan mode offline</li>
                      <li>• Coba lagi nanti</li>
                    </ul>
                  </motion.div>
                </div>
              </motion.div>

              {/* Status Information */}
              <motion.div 
                className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.6 }}
              >
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  ℹ️ Informasi Status:
                </h4>
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p>• Sistem secara otomatis mencatat kesalahan ini</p>
                  <p>• Tim teknis akan segera menindaklanjuti</p>
                  <p>• Data Anda aman dan tidak hilang</p>
                </div>
              </motion.div>

              {/* Footer Note */}
              <motion.div 
                className="text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.8 }}
              >
                Error ID: {error.digest || 'EDU-GRADE-' + Date.now()}
                <br />
                Waktu: {new Date().toLocaleString('id-ID')}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}