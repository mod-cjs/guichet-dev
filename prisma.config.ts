import path from 'node:path'
import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Ordre de priorité : .env.local (dev) > .env.prod (Plesk) > .env (fallback)
config({ path: '.env.local', override: false })
config({ path: '.env.prod',  override: false })
config({ path: '.env',       override: false })

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
})
