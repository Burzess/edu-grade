# EduGrade - Sistem Penilaian Otomatis

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-Private-red)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

## Deskripsi

EduGrade adalah Sistem Penilaian Otomatis berbasis web yang dirancang untuk membantu proses evaluasi pembelajaran di lingkungan pendidikan. Sistem ini memanfaatkan teknologi kecerdasan buatan (AI) dari Google Gemini dan OpenAI untuk melakukan penilaian otomatis terhadap jawaban siswa, sehingga mengurangi beban kerja guru dan meningkatkan konsistensi penilaian.

Dibangun menggunakan Next.js 15 dengan TypeScript dan Supabase sebagai backend, EduGrade menyediakan antarmuka yang responsif dan modern untuk tiga peran pengguna utama: Admin, Guru, dan Siswa.

## Fitur Utama

### Admin

- Manajemen pengguna (guru dan siswa)
- Monitoring aktivitas sistem
- Konfigurasi pengaturan global
- Dashboard statistik keseluruhan
- Manajemen survei kepuasan

### Guru

- Manajemen kelas dan anggota kelas
- Pembuatan dan pengelolaan bank soal
- Pembuatan ujian dengan berbagai tipe soal
- Penilaian otomatis menggunakan AI (Gemini/OpenAI)
- Monitoring progres siswa dan hasil ujian
- Export hasil penilaian

### Siswa

- Mengikuti kelas yang tersedia
- Mengerjakan ujian secara online
- Melihat hasil dan feedback penilaian AI
- Dashboard progres pembelajaran pribadi
- Mengisi survei kepuasan

## Tech Stack

| Teknologi | Versi | Kategori |
|-----------|-------|----------|
| Next.js | 15.5.12 | Framework |
| TypeScript | 5.9.2 | Bahasa |
| Supabase | 2.52.1 | Database & Auth |
| Google Gemini (AI SDK) | 3.0.60 | AI Provider |
| OpenAI | 5.23.0 | AI Provider |
| Vercel AI SDK | 6.0.153 | AI Integration |
| Zustand | 5.0.6 | State Management |
| TanStack Query | 5.83.0 | Data Fetching |
| Tailwind CSS | 4.1.13 | Styling |
| Radix UI | various | UI Components |
| HeroUI | 2.8.3 | UI Components |
| Inngest | 4.2.0 | Background Jobs |
| Vitest | 1.5.9 | Testing |
| fast-check | 4.8.0 | Property Testing |
| Zod | 3.23.8 | Validasi |

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd edu-grade

# Install dependencies
npm install

# Salin file environment
cp .env.local.example .env.local

# Isi konfigurasi environment variables (lihat docs/setup-guide.md)

# Jalankan development server
npm run dev
```

Untuk panduan instalasi lengkap termasuk setup database, konfigurasi API keys, dan troubleshooting, lihat **[Panduan Setup](docs/setup-guide.md)**.

## Dokumentasi

| No | Dokumen | Deskripsi |
|----|---------|-----------|
| 1 | [Arsitektur Sistem](docs/architecture.md) | Penjelasan arsitektur keseluruhan sistem, pola desain, dan hubungan antar layer |
| 2 | [Entity Relationship Diagram](docs/erd.md) | Diagram dan dokumentasi relasi antar tabel database |
| 3 | [Dokumentasi Use Case](docs/use-cases.md) | Use case diagram dan narasi interaksi aktor dengan sistem |
| 4 | [Desain Sistem](docs/system-design.md) | Sequence diagram, activity diagram, dan design patterns |
| 5 | [Tech Stack](docs/tech-stack.md) | Penjelasan mendalam pemilihan teknologi dan perbandingan alternatif |
| 6 | [Dokumentasi API](docs/api-documentation.md) | Dokumentasi lengkap seluruh API endpoint dengan contoh request/response |
| 7 | [Panduan Setup](docs/setup-guide.md) | Panduan instalasi dan konfigurasi lingkungan pengembangan |
| 8 | [Struktur Folder](docs/folder-structure.md) | Penjelasan organisasi kode dan konvensi penamaan |
| 9 | [Coding Conventions](docs/coding-conventions.md) | Panduan konvensi penulisan kode dan standar proyek |
| 10 | [Panduan Deployment](docs/deployment-guide.md) | Panduan deployment ke Vercel dan konfigurasi produksi |
