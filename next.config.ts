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
    // CSP permissif pour les outils dev (route /preview-v2 et /api/dev/*).
    // Inclut unpkg.com pour les CDN React/Babel utilisés par les HTML du design v2.
    // Limité à NODE_ENV !== production via le guard runtime de la route ;
    // ces routes renvoient 404 en prod, donc ce CSP n'y est jamais servi.
    const devPreviewCsp = [
      "default-src 'self' https://unpkg.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://unpkg.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
    ].join('; ')

    const strictHeaders = [
      { key: 'X-Frame-Options',              value: 'DENY' },
      { key: 'X-Content-Type-Options',        value: 'nosniff' },
      { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
      { key: 'X-XSS-Protection',              value: '1; mode=block' },
      { key: 'Permissions-Policy',            value: 'geolocation=(), camera=(), microphone=()' },
      { key: 'Strict-Transport-Security',     value: 'max-age=31536000; includeSubDomains' },
      { key: 'Content-Security-Policy',       value: CSP },
    ]

    const devPreviewHeaders = [
      { key: 'X-Frame-Options',              value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options',        value: 'nosniff' },
      { key: 'Referrer-Policy',               value: 'no-referrer' },
      { key: 'Content-Security-Policy',       value: devPreviewCsp },
    ]

    return [
      // Routes dev : exemptées du CSP strict + X-Frame-Options DENY.
      // Doivent venir AVANT le pattern global pour que leurs valeurs gagnent.
      { source: '/preview-v2',          headers: devPreviewHeaders },
      { source: '/api/dev/:path*',      headers: devPreviewHeaders },
      // GUIC-258 : maquettes design statiques sous public/design-v2/ utilisent
      // React + Babel via unpkg CDN + transpilation runtime (eval). CSP strict
      // bloque → page blanche. CSP permissif requis pour cette route publique.
      { source: '/design-v2/:path*',    headers: devPreviewHeaders },
      // Toutes les autres routes : CSP strict, frame-ancestors 'none', X-Frame DENY.
      // Exclusion explicite des routes dev via negative lookahead path-to-regexp.
      { source: '/:path((?!preview-v2$|api/dev/|design-v2/).*)', headers: strictHeaders },
    ]
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
