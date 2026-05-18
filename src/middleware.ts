// nodeMiddleware: true dans next.config.ts active le runtime Node.js pour ce fichier.
// Cela permet d'utiliser ioredis (session-store denylist) directement en middleware.
export const runtime = 'nodejs'

export { proxy as default, config } from '@/proxy'
