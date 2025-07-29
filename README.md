# Edu-Grade - Sistem Penilaian Otomatis

Platform pembelajaran modern dengan sistem penilaian otomatis menggunakan AI untuk membantu guru dan siswa dalam proses belajar mengajar.

## 🚀 Fitur Utama

### Untuk Guru:
- ✅ Autentikasi dengan role-based access
- ✅ Dashboard guru dengan statistik
- 🔄 Kelola bank soal essay (CRUD)
- 🔄 Buat dan kelola ujian
- 🔄 Penilaian otomatis dengan AI
- 🔄 Lihat hasil dan berikan feedback manual

### Untuk Siswa:
- ✅ Autentikasi dengan role-based access  
- ✅ Dashboard siswa
- 🔄 Mengerjakan ujian yang tersedia
- 🔄 Lihat hasil dan feedback

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Components**: ShadCN UI
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form + Zod
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Language**: TypeScript

## 📦 Setup Development

### 1. Clone dan Install Dependencies

```bash
git clone <repository-url>
cd edu-grade
npm install
```

### 2. Setup Supabase

1. Buat project baru di [Supabase](https://supabase.com)
2. Dapatkan URL dan anon key dari Settings > API
3. Copy `.env.local.example` ke `.env.local`:

```bash
cp .env.local.example .env.local
```

4. Update file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXTAUTH_SECRET=your_random_secret_key
NEXTAUTH_URL=http://localhost:3000
```

### 3. Setup Database Schema

1. Buka Supabase Dashboard
2. Masuk ke SQL Editor
3. Copy dan jalankan script dari `supabase/schema.sql`

Script ini akan membuat:
- Table `profiles` dengan role (siswa/guru)
- Table `soal` untuk bank soal
- Table `ujian` untuk ujian
- Table `ujian_soal` untuk relasi ujian-soal
- Table `jawaban` untuk jawaban siswa
- Row Level Security (RLS) policies
- Indexes untuk performa
- Trigger untuk auto-create profile

### 4. Setup Authentication

Di Supabase Dashboard:
1. Masuk ke Authentication > Settings
2. Pastikan "Enable email confirmations" diaktifkan sesuai kebutuhan
3. Atur redirect URLs jika diperlukan

### 5. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000)

## 📁 Struktur Project

```
src/
├── app/                    # Next.js App Router pages
│   ├── guru/              # Protected routes for guru
│   │   └── dashboard/     # Guru dashboard
│   ├── siswa/             # Protected routes for siswa  
│   │   └── dashboard/     # Siswa dashboard
│   ├── login/             # Login page
│   ├── register/          # Register page
│   └── layout.tsx         # Root layout with providers
├── components/
│   ├── providers/         # React providers
│   └── ui/               # ShadCN UI components
├── lib/
│   └── supabase/         # Supabase client configurations
├── store/                # Zustand stores
├── types/                # TypeScript type definitions
└── middleware.ts         # Route protection middleware
```

## 🔐 Authentication & Authorization

### Role-based Access Control:
- **Siswa**: Akses ke `/siswa/*` routes
- **Guru**: Akses ke `/guru/*` routes
- **Public**: `/`, `/login`, `/register`

### Row Level Security (RLS):
- Users hanya bisa akses data mereka sendiri
- Guru hanya bisa kelola soal/ujian yang mereka buat
- Siswa hanya bisa lihat ujian aktif & jawaban mereka sendiri

## 🚧 Development Roadmap

### ✅ Phase 1 - Foundation (COMPLETED)
- [x] Next.js project setup dengan TypeScript
- [x] ShadCN UI configuration
- [x] Supabase client setup
- [x] Authentication system
- [x] Database schema dengan RLS
- [x] Route protection middleware
- [x] Basic dashboard untuk guru & siswa

### 🔄 Phase 2 - Guru: CRUD Soal (IN PROGRESS)
- [ ] Halaman daftar soal dengan pagination
- [ ] Form create/edit soal
- [ ] Delete soal dengan confirmation
- [ ] Filter dan search soal
- [ ] Tag management system

### 📋 Phase 3 - Guru: Kelola Ujian (PLANNED)
- [ ] Halaman daftar ujian
- [ ] Form create ujian dengan pilih soal
- [ ] Edit ujian dan soal yang dipilih
- [ ] Validasi waktu ujian
- [ ] Preview ujian sebelum publish

### 👨‍🎓 Phase 4 - Siswa: Mengerjakan Ujian (PLANNED)
- [ ] Daftar ujian yang tersedia
- [ ] Interface mengerjakan ujian
- [ ] Submit jawaban
- [ ] Integration dengan AI untuk scoring
- [ ] Timer dan validasi waktu ujian

### 📊 Phase 5 - Hasil & Feedback (PLANNED)
- [ ] Dashboard hasil untuk guru
- [ ] Manual override scoring
- [ ] Feedback system
- [ ] Export hasil ke CSV/PDF
- [ ] Dashboard hasil untuk siswa

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.
