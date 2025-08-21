import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compiler options untuk menghapus console.log di production
  compiler: {
    // Menghapus console.log di production (Next.js 12.1+)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'] // Tetap pertahankan console.error untuk debugging production issues
    } : false,
  },
  
  // ESLint configuration untuk build
  eslint: {
    // Selama development, abaikan ESLint errors untuk console.log
    // karena akan dihapus otomatis saat production build
    ignoreDuringBuilds: false,
  },
  
  // TypeScript configuration
  typescript: {
    // Jangan skip type checking saat build
    ignoreBuildErrors: false,
  },
  
  // Webpack config sebagai fallback
  webpack: (config, { dev }) => {
    // Hanya apply optimasi jika bukan development
    if (!dev) {
      // Pastikan optimization object ada
      if (!config.optimization) {
        config.optimization = {};
      }
      
      // Enable minimize untuk production
      config.optimization.minimize = true;
    }
    
    return config;
  },
  
  // Experimental features untuk optimasi production
  experimental: {
    // Optimasi untuk production build
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  /* config options here */
};

export default nextConfig;
