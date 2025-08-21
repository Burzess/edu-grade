import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Menghapus console.log dari production build
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      // Konfigurasi untuk menghapus console.log di production
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
      
      // Untuk client-side, gunakan drop_console
      if (!isServer) {
        const TerserPlugin = require('terser-webpack-plugin');
        config.optimization.minimizer = config.optimization.minimizer || [];
        config.optimization.minimizer.push(
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true, // Menghapus semua console statements
                drop_debugger: true, // Menghapus debugger statements
              },
            },
          })
        );
      }
    }
    return config;
  },
  
  // Compiler options untuk production
  compiler: {
    // Menghapus console.log di production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  /* config options here */
};

export default nextConfig;
