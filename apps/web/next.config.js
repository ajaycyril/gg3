/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
  // V0 optimizations
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  // V0 edge runtime optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // V0 performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  // V0 serverless function configuration
  serverRuntimeConfig: {},
  publicRuntimeConfig: {},
  // V0 caching optimizations
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig