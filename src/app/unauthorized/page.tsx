"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Home, LogIn, AlertCircle, Lock, UserX } from "lucide-react";
import { motion } from "framer-motion";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="max-w-xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="w-full shadow-lg border-amber-200 dark:border-amber-800">
            <CardHeader className="space-y-6">
              {/* Animated Lock Icon */}
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
                <div className="relative">
                  <div className="p-6 rounded-full bg-amber-100 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700">
                    <motion.div
                      animate={{ 
                        rotate: [0, -5, 5, -5, 0],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                    >
                      <Shield className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                    </motion.div>
                  </div>
                  
                  {/* Floating Icons */}
                  <motion.div
                    className="absolute -top-2 -right-2 p-2 rounded-full bg-red-100 dark:bg-red-950/50"
                    animate={{ 
                      y: [-3, 3, -3],
                      rotate: [0, 10, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Lock className="h-5 w-5 text-red-500" />
                  </motion.div>
                  
                  <motion.div
                    className="absolute -bottom-2 -left-2 p-2 rounded-full bg-orange-100 dark:bg-orange-950/50"
                    animate={{ 
                      y: [3, -3, 3],
                      rotate: [0, -10, 0]
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5
                    }}
                  >
                    <UserX className="h-5 w-5 text-orange-500" />
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
                <div className="text-6xl md:text-7xl font-bold text-amber-600 dark:text-amber-400">
                  403
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
                  Akses Ditolak
                </CardTitle>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <CardDescription className="text-base text-muted-foreground max-w-md mx-auto">
                  Anda tidak memiliki izin untuk mengakses halaman ini. 
                  Silakan login dengan akun yang sesuai atau hubungi administrator.
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
                  <Button asChild size="lg" className="gap-2 shadow-md">
                    <Link href="/login">
                      <LogIn className="h-4 w-4" />
                      Login Ulang
                    </Link>
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild variant="outline" size="lg" className="gap-2">
                    <Link href="/">
                      <Home className="h-4 w-4" />
                      Ke Halaman Utama
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>

              {/* Permission Info */}
              <motion.div 
                className="border-t pt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
              >
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center justify-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Level Akses yang Diperlukan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <motion.div 
                    className="space-y-3 p-4 rounded-lg bg-muted/30"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h4 className="font-medium text-foreground">🎓 Akses Siswa:</h4>
                    <ul className="text-muted-foreground space-y-1.5">
                      <li>• Dashboard pembelajaran</li>
                      <li>• Ujian dan tugas</li>
                      <li>• Melihat nilai</li>
                      <li>• Progress belajar</li>
                    </ul>
                  </motion.div>
                  <motion.div 
                    className="space-y-3 p-4 rounded-lg bg-muted/30"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h4 className="font-medium text-foreground">👨‍🏫 Akses Guru:</h4>
                    <ul className="text-muted-foreground space-y-1.5">
                      <li>• Kelola ujian</li>
                      <li>• Bank soal</li>
                      <li>• Monitor siswa</li>
                      <li>• Analisis AI</li>
                    </ul>
                  </motion.div>
                </div>
              </motion.div>

              {/* Security Notice */}
              <motion.div 
                className="bg-brand-50 dark:bg-brand-950/30 p-4 rounded-lg border border-brand-200 dark:border-brand-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.4 }}
              >
                <h4 className="font-medium text-brand-900 dark:text-brand-100 mb-2 flex items-center gap-2">
                  🔐 Keamanan Sistem:
                </h4>
                <div className="text-sm text-brand-800 dark:text-brand-200 space-y-1">
                  <p>• Setiap akses dimonitor untuk keamanan</p>
                  <p>• Login dengan kredensial yang benar</p>
                  <p>• Hubungi admin jika butuh upgrade akses</p>
                </div>
              </motion.div>

              {/* Contact Information */}
              <motion.div 
                className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.6 }}
              >
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  📞 Butuh Bantuan?
                </h4>
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p>Jika Anda yakin ini adalah kesalahan sistem:</p>
                  <p className="font-medium mt-1">
                    • Hubungi administrator sekolah<br/>
                    • Laporan ke tim IT<br/>
                    • Screenshot halaman ini untuk referensi
                  </p>
                </div>
              </motion.div>

              {/* Footer Note */}
              <motion.div 
                className="text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.8 }}
              >
                Akses ditolak pada {new Date().toLocaleString('id-ID')}
                <br />
                Session ID: {Date.now().toString(36)}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
