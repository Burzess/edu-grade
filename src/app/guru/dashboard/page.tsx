'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/store/auth"
import { useAuth } from "@/components/providers/auth-provider"
import Link from "next/link"

export default function GuruDashboard() {
    const { profile } = useAuthStore()
    const { signOut } = useAuth()

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">
                                Edu-Grade - Dashboard Guru
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-700">
                                Selamat datang, {profile?.full_name}
                            </span>
                            <Button variant="outline" onClick={signOut}>
                                Keluar
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Dashboard Guru
                        </h2>
                        <p className="text-gray-600">
                            Kelola soal, ujian, dan pantau hasil siswa dari satu tempat.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    📝 Bank Soal
                                </CardTitle>
                                <CardDescription>
                                    Kelola koleksi soal essay untuk berbagai ujian
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Buat, edit, dan organisir soal essay dengan sistem tag.
                                    </p>
                                    <div className="space-y-2">
                                        <Button asChild className="w-full">
                                            <Link href="/guru/soal">Kelola Soal</Link>
                                        </Button>
                                        <Button asChild variant="outline" className="w-full">
                                            <Link href="/guru/soal/new">Buat Soal Baru</Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    📋 Ujian
                                </CardTitle>
                                <CardDescription>
                                    Susun dan atur jadwal ujian untuk siswa
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Buat ujian dengan memilih soal dari bank soal.
                                    </p>
                                    <div className="space-y-2">
                                        <Button asChild className="w-full">
                                            <Link href="/guru/ujian">Kelola Ujian</Link>
                                        </Button>
                                        <Button asChild variant="outline" className="w-full">
                                            <Link href="/guru/ujian/new">Buat Ujian Baru</Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    📊 Hasil & Nilai
                                </CardTitle>
                                <CardDescription>
                                    Pantau hasil ujian dan berikan feedback
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Lihat hasil penilaian AI dan berikan feedback manual.
                                    </p>
                                    <div className="space-y-2">
                                        <Button asChild className="w-full">
                                            <Link href="/guru/hasil">Lihat Hasil</Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Statistik Ringkas</CardTitle>
                                <CardDescription>
                                    Ikhtisar aktivitas dan performa terkini
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">0</div>
                                        <div className="text-sm text-gray-600">Total Soal</div>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">0</div>
                                        <div className="text-sm text-gray-600">Total Ujian</div>
                                    </div>
                                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                        <div className="text-2xl font-bold text-yellow-600">0</div>
                                        <div className="text-sm text-gray-600">Ujian Aktif</div>
                                    </div>
                                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">0</div>
                                        <div className="text-sm text-gray-600">Jawaban Masuk</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
