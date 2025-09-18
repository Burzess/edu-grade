"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, BookOpen, Users, GraduationCap, Search, RefreshCw } from "lucide-react";
import { AnimatedNotFoundIllustration } from "@/components/ui/animated-not-found";
import { motion } from "framer-motion";

export default function NotFound() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="w-full shadow-lg">
            <CardHeader className="space-y-6">
              {/* Animated Illustration */}
              <AnimatedNotFoundIllustration />
              
              {/* 404 Number with Gradient */}
              <motion.div 
                className="flex justify-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="text-7xl md:text-8xl font-bold bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                  404
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
                  Halaman Tidak Ditemukan
                </CardTitle>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <CardDescription className="text-base text-muted-foreground max-w-md mx-auto">
                  Oops! Halaman yang Anda cari sepertinya tidak ada di sistem Edu-Grade. 
                  Mungkin halaman telah dipindahkan atau URL yang dimasukkan salah.
                </CardDescription>
              </motion.div>
            </CardHeader>
            
            <CardContent className="space-y-8">
              {/* Platform Features Icons */}
              <motion.div 
                className="flex justify-center space-x-4 text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <motion.div 
                  className="p-3 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <BookOpen className="h-6 w-6" />
                </motion.div>
                <motion.div 
                  className="p-3 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Users className="h-6 w-6" />
                </motion.div>
                <motion.div 
                  className="p-3 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <GraduationCap className="h-6 w-6" />
                </motion.div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild size="lg" className="gap-2 shadow-md">
                    <Link href="/">
                      <Home className="h-4 w-4" />
                      Kembali ke Beranda
                    </Link>
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild variant="outline" size="lg" className="gap-2">
                    <Link href="/login">
                      <ArrowLeft className="h-4 w-4" />
                      Ke Halaman Login
                    </Link>
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    className="gap-2"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Muat Ulang
                  </Button>
                </motion.div>
              </motion.div>

              {/* Help Section */}
              {/* <motion.div 
                className="border-t pt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
              >
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center justify-center gap-2">
                  <Search className="h-5 w-5" />
                  Cari Yang Anda Butuhkan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <motion.div 
                    className="space-y-3 p-4 rounded-lg bg-muted/30"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      🎓 Untuk Siswa:
                    </h4>
                    <ul className="text-muted-foreground space-y-1.5">
                      <li>• Akses ujian dan tugas</li>
                      <li>• Lihat nilai dan progress</li>
                      <li>• Dashboard pembelajaran</li>
                      <li>• Riwayat ujian</li>
                    </ul>
                  </motion.div>
                  <motion.div 
                    className="space-y-3 p-4 rounded-lg bg-muted/30"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      👨‍🏫 Untuk Guru:
                    </h4>
                    <ul className="text-muted-foreground space-y-1.5">
                      <li>• Kelola ujian dan soal</li>
                      <li>• Monitor siswa</li>
                      <li>• Analisis penilaian AI</li>
                      <li>• Laporan detail</li>
                    </ul>
                  </motion.div>
                </div>
              </motion.div> */}

              {/* Common Suggestions */}
              {/* <motion.div 
                className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.4 }}
              >
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  💡 Kemungkinan yang Anda Cari:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <Link 
                    href="/siswa/dashboard" 
                    className="text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    📊 Dashboard Siswa
                  </Link>
                  <Link 
                    href="/guru/dashboard" 
                    className="text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    🎯 Dashboard Guru
                  </Link>
                  <Link 
                    href="/siswa/ujian" 
                    className="text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    📝 Daftar Ujian
                  </Link>
                  <Link 
                    href="/guru/soal" 
                    className="text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    ❓ Bank Soal
                  </Link>
                  <Link 
                    href="/siswa/nilai" 
                    className="text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    🏆 Nilai & Rapor
                  </Link>
                  <Link 
                    href="/guru/siswa" 
                    className="text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    👥 Kelola Siswa
                  </Link>
                </div>
              </motion.div> */}

              {/* Footer Note */}
              {/* <motion.div 
                className="text-xs text-muted-foreground flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.6 }}
              >
                <span>Jika masalah berlanjut, hubungi administrator sekolah Anda</span>
              </motion.div> */}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}