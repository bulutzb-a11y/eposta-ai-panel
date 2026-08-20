import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Vercel build sırasında TypeScript hatalarını görmezden gelir
    ignoreBuildErrors: true,
  },
  eslint: {
    // Vercel build sırasında ESLint hatalarını görmezden gelir
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;