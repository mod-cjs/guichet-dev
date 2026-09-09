import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// GUIC-700 — La MariaDB Plesk (préprod/prod) est mutualisée avec la SSO et le BRM. La SSO
// (Laravel `strict => true`) s'impose déjà son propre sql_mode par connexion, mais le BRM
// (`strict => false`) hérite entièrement du sql_mode GLOBAL du serveur : un `SET GLOBAL`
// pour fermer la brèche des dates zéro (GUIC-696 R4) l'exposerait sans qu'on puisse
// vérifier depuis ce dépôt. `sessionVariables` du driver `mariadb` pose donc la même
// protection, mais SEULEMENT sur les connexions ouvertes par Guichet — un `SET @@sql_mode`
// exécuté à l'ouverture de chaque connexion, jamais sur le serveur partagé.
export function avecSqlModeStrict(url: string): string {
  const u = new URL(url)
  if (!u.searchParams.has('sessionVariables')) {
    u.searchParams.set(
      'sessionVariables',
      JSON.stringify({ sql_mode: 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE' })
    )
  }
  return u.toString()
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL manquante')
  const adapter = new PrismaMariaDb(avecSqlModeStrict(url))
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
