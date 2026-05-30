import type { NextConfig } from "next";

const allowedOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || "";

const nextConfig: NextConfig = {
  // Compiler options untuk menghapus console di production
  compiler: {
    // Menghapus semua console calls di production (Next.js 12.1+)
    // Logging in production should go through src/lib/logger.ts which redacts PII
    removeConsole: process.env.NODE_ENV === 'production' ? true : false,
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
  async headers() {
    // Only set CORS headers when an explicit origin is configured via env.
    // Without NEXT_PUBLIC_ALLOWED_ORIGIN the app relies on same-origin (browser default).
    if (!allowedOrigin) {
      return [];
    }

    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ];
  },
};

export default nextConfig;
