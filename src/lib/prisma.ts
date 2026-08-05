import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// GUIC-700 — stub RED : signature posée, comportement pas encore correct (tsc l'exige).
export function avecSqlModeStrict(url: string): string {
  return url
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL manquante')
  const adapter = new PrismaMariaDb(url)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Lazy proxy — PrismaMariaDb n'est instancié qu'au premier appel, pas au module load
let _client: PrismaClient | undefined

function getClient(): PrismaClient {
  if (!_client) {
    _client = globalForPrisma.prisma ?? createClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _client
  }
  return _client
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
