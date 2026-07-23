import path from 'node:path'
import { defineConfig, env } from 'prisma/config'

// En local, charger .env.local / .env.prod si dotenv est disponible
try {
  const { config } = await import('dotenv')
  config({ path: '.env.local', override: false })
  config({ path: '.env.prod',  override: false })
  config({ path: '.env',       override: false })
} catch {
  // dotenv absent (prod/Vercel) — les variables sont injectées par l'environnement
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
    // GUIC-581 — l'utilisateur MariaDB local n'a pas CREATE DATABASE : les
    // `migrate dev` locaux passent par une shadow DB explicite (base scratch
    // vide, ex. yaye_migration_test). Optionnel — sans la variable, Prisma
    // retombe sur la shadow DB auto-créée (CI / envs avec droits).
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
  migrations: {
    seed: 'tsx prisma/seed/index.ts',
  },
})
