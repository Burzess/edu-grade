# Console Log Management Guide

## Ringkasan

Proyek ini telah dikonfigurasi untuk secara otomatis menghilangkan console.log dari production build. Berikut adalah cara kerja dan penggunaannya:

## Konfigurasi yang Sudah Diterapkan

### 1. Next.js Configuration (`next.config.ts`)
- **Compiler removeConsole**: Menghapus console.log otomatis di production
- **Webpack TerserPlugin**: Menggunakan `drop_console: true` untuk menghapus semua console statements
- **Server-side & Client-side**: Konfigurasi berbeda untuk optimasi

### 2. ESLint Configuration (`eslint.config.mjs`)
- **no-console rule**: Warning di development, error di production
- **no-debugger rule**: Warning di development, error di production

### 3. Custom Logger (`src/lib/logger.ts`)
- Logger utility yang environment-aware
- Otomatis disabled di production (kecuali error)
- Support berbagai log levels: debug, info, warn, error

## Cara Penggunaan

### Development
```typescript
// ❌ Jangan gunakan console.log langsung
console.log("Debug info");

// ✅ Gunakan custom logger
import { logger } from '@/lib/logger';

logger.debug("Debug info");
logger.info("Info message"); 
logger.warn("Warning message");
logger.error("Error message");

// ✅ Atau untuk conditional logging
logger.devOnly(() => {
  console.log("Ini hanya muncul di development");
});

logger.conditional(someCondition, 'info', 'Conditional message');
```

### Production Build
Saat menjalankan `bun run build` atau `npm run build`:
1. Semua console.log akan dihapus otomatis
2. Custom logger akan hanya menampilkan error
3. Bundle size akan lebih kecil karena logging code dihapus

## Scripts Available

```bash
# Development
bun dev

# Production build (akan menghapus semua console.log)
bun run build
bun run build:production

# Lint dengan pengecekan console.log
bun run lint
bun run lint:fix
```

## Best Practices

1. **Selalu gunakan custom logger** instead of console.log
2. **Gunakan appropriate log levels**:
   - `debug`: Detail debugging info (development only)
   - `info`: General information  
   - `warn`: Warning messages
   - `error`: Error messages (tetap ada di production)

3. **Testing deployment**:
   ```bash
   bun run build
   bun run start
   ```
   Kemudian cek di browser devtools - tidak akan ada console.log

## Environment Variables

Atur di `.env.local`:
```env
NODE_ENV=production  # Akan disable semua console selain error
NEXT_PUBLIC_ENABLE_LOGGING=false  # Disable custom logger
```

## Verifikasi

Untuk memastikan console.log tidak masuk deployment:
1. Run `bun run build`
2. Check build output di `.next/static/chunks/`
3. Search for "console.log" - seharusnya tidak ada
4. Deploy ke production dan check browser devtools

Dengan konfigurasi ini, semua console.log akan otomatis dihilangkan dari production build, namun tetap available saat development.
