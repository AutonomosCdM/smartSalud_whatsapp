/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // v5: SSR deployment on Railway (removed static export)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  typescript: {
    // Skip type checking for backend-agents directory (Cloudflare Workers code)
    tsconfigPath: './tsconfig.json',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };
    return config;
  },
}

module.exports = nextConfig
