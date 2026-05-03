import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'guichet.cjs.sn' },
      { protocol: 'https', hostname: 'sso.cjs.sn' },
    ],
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }]
  },
  async redirects() {
    return [
      { source: '/node/:path*',  destination: '/', permanent: true },
      { source: '/user/login',   destination: '/auth/connexion', permanent: true },
    ]
  },
}

export default nextConfig
