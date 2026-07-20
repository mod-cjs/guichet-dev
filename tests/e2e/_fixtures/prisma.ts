/**
 * GUIC-616 — Client Prisma partagé par les fixtures E2E.
 *
 * Un seul pool pour toutes les fixtures (centres, utilisateur…) : deux clients concurrents
 * ouvraient deux pools sur la même base pour rien.
 *
 * Prisma 7 exige un ADAPTATEUR : `new PrismaClient()` nu lève « PrismaClient needs to be
 * constructed with a non-empty, valid PrismaClientOptions » (cf. src/lib/prisma.ts).
 */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

let _prisma: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL manquante (fixtures E2E)')
    _prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) })
  }
  return _prisma
}

/** Ferme la connexion Prisma (`afterAll`). */
export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect()
    _prisma = null
  }
}
