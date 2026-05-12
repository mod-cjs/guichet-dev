import path from 'node:path'
import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Next.js utilise .env.local — dotenv/config ne le charge pas par défaut
config({ path: '.env.local', override: false })
config({ path: '.env', override: false })

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
})
