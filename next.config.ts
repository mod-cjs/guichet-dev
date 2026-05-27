import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

const ssoOrigin = process.env.SSO_BASE_URL ?? 'https://sso.cjs.sn'
const appOrigin = process.env.NEXTAUTH_URL  ?? 'https://guichet.cjs.sn'

const ssoHostname = new URL(ssoOrigin).hostname
const appHostname = new URL(appOrigin).hostname

const CSP = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${appOrigin} ${ssoOrigin}`,
  "font-src 'self'",
  `connect-src 'self' ${ssoOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  // experimental.nodeMiddleware retiré en Next.js 16.2 — le runtime du middleware
  // est désormais déclaré dans src/middleware.ts via `export const config.runtime`.
  images: {
    remotePatterns: [
      { protocol: appOrigin.startsWith('https') ? 'https' : 'http', hostname: appHostname },
      { protocol: ssoOrigin.startsWith('https') ? 'https' : 'http', hostname: ssoHostname },
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
      { source: '/evenements',         destination: '/agenda',         permanent: true },
      { source: '/evenements/:path*',  destination: '/agenda/:path*',  permanent: true },
    ]
  },
}

export default nextConfig
