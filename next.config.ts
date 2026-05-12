import type { NextConfig } from 'next'

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-eval requis par Next.js dev
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://guichet.cjs.sn https://sso.cjs.sn",
  "font-src 'self'",
  "connect-src 'self' https://sso.cjs.sn",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

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
        { key: 'X-Frame-Options',              value: 'DENY' },
        { key: 'X-Content-Type-Options',        value: 'nosniff' },
        { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection',              value: '1; mode=block' },
        { key: 'Permissions-Policy',            value: 'geolocation=(), camera=(), microphone=()' },
        { key: 'Strict-Transport-Security',     value: 'max-age=31536000; includeSubDomains' },
        { key: 'Content-Security-Policy',       value: CSP },
      ],
    }]
  },
  async redirects() {
    return [
      { source: '/node/:path*', destination: '/', permanent: false },
      { source: '/user/login',  destination: '/auth/connexion', permanent: false },
    ]
  },
}

export default nextConfig
