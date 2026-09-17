/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Keep deployment builds unblocked while the existing lint backlog is cleaned up.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig