import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

const ssoOrigin = process.env.SSO_BASE_URL ?? 'https://sso.cjs.sn'
const appOrigin = process.env.NEXTAUTH_URL  ?? 'https://guichet.cjs.sn'

const ssoHostname = new URL(ssoOrigin).hostname
const appHostname = new URL(appOrigin).hostname

// Google Maps JavaScript API — chargée par `@googlemaps/js-api-loader` côté
// browser sur la page `/centres`. Le loader injecte un <script> depuis
// `maps.googleapis.com`, qui télécharge ensuite des modules supplémentaires
// (`*.googleapis.com`, `*.gstatic.com`) et des tuiles bitmap. CSP strict =
// page blanche + erreur "Carte indisponible". GUIC-368.
const GOOGLE_MAPS_SCRIPT  = 'https://maps.googleapis.com https://maps.gstatic.com'
const GOOGLE_MAPS_CONNECT = 'https://maps.googleapis.com https://maps.gstatic.com'
const GOOGLE_MAPS_IMG     = 'https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com'
const GOOGLE_MAPS_STYLE   = 'https://fonts.googleapis.com'
const GOOGLE_MAPS_FONT    = 'https://fonts.gstatic.com'

// GUIC-368 — CSP doit autoriser Google Maps (script/style/img/font/connect)
// sinon /centres reste blanc avec "Carte indisponible". Les constantes
// GOOGLE_MAPS_* DOIVENT être interpolées ici — merge --theirs antérieur
// les a perdues une fois ; commentaire explicite pour éviter régression.
const CSP = [
  "default-src 'self'",
  isDev
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${GOOGLE_MAPS_SCRIPT}`
    : `script-src 'self' 'unsafe-inline' ${GOOGLE_MAPS_SCRIPT}`,
  `style-src 'self' 'unsafe-inline' ${GOOGLE_MAPS_STYLE}`,
  `img-src 'self' data: blob: ${appOrigin} ${ssoOrigin} https://*.public.blob.vercel-storage.com ${GOOGLE_MAPS_IMG}`,
  `font-src 'self' ${GOOGLE_MAPS_FONT}`,
  `connect-src 'self' ${ssoOrigin} ${GOOGLE_MAPS_CONNECT}`,
  // GUIC-366 — visionneuse ressources : iframe PDF via proxy (self) + embed vidéo
  // YouTube/Vimeo. Sans `frame-src`, la CSP retombe sur default-src 'self' et bloque
  // l'embed vidéo.
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  // experimental.nodeMiddleware retiré en Next.js 16.2 — le runtime du middleware
  // est désormais déclaré dans src/middleware.ts via `export const config.runtime`.
  images: {
    // GUIC-689 — la photo de profil est servie par une route locale AVEC une
    // query string anti-cache (`?cb=<cjsUid>`, cf. `getProfilePhotoUrl`). Next 16
    // refuse toute image locale à query string tant qu'un motif ne l'autorise
    // pas : sans cette entrée, `/jeune/mon-profil` renvoie 500 dès que le jeune
    // a une photo. On n'ouvre QUE ce chemin — un `/**` exposerait l'optimiseur
    // d'images à n'importe quelle route locale.
    // ⚠️ Déclarer `localPatterns` REMPLACE le défaut de Next : la première
    // entrée restaure ce défaut (tout `/public`, SANS query string), la
    // seconde ouvre la seule route qui en porte une.
    localPatterns: [
      { pathname: '/**', search: '' },
      { pathname: '/api/profil/photo/file' },
    ],
    remotePatterns: [
      { protocol: appOrigin.startsWith('https') ? 'https' : 'http', hostname: appHostname },
      { protocol: ssoOrigin.startsWith('https') ? 'https' : 'http', hostname: ssoHostname },
      // GUIC-360 — photos de profil servies depuis Vercel Blob.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
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
      // GUIC-375 — SAMEORIGIN (au lieu de DENY) pour autoriser PdfViewer à
      // embed `/api/ressources/[id]/proxy` dans une iframe same-origin.
      { key: 'X-Frame-Options',              value: 'SAMEORIGIN' },
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
      // GUIC-258 / GUIC-428 : maquettes design statiques sous public/design-v2/
      // et public/design-v3/ utilisent React + Babel via unpkg CDN + transpilation
      // runtime (eval). CSP strict bloque → page blanche. CSP permissif requis.
      { source: '/design-v2/:path*',    headers: devPreviewHeaders },
      { source: '/design-v3/:path*',    headers: devPreviewHeaders },
      // Toutes les autres routes : CSP strict, frame-ancestors 'none', X-Frame DENY.
      // Exclusion explicite des routes dev via negative lookahead path-to-regexp.
      { source: '/:path((?!preview-v2$|api/dev/|design-v2/|design-v3/).*)', headers: strictHeaders },
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
