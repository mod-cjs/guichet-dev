import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { compterVolumes, type CountDelegate, type Volumes } from '@/lib/datahub/volumes'
import type { ApiResponse } from '@/types/api'

/**
 * Data Hub — `GET /api/admin/data-hub/volumes`
 *
 * Le volume actuel de chaque flux exporté, affiché à côté de sa description dans le
 * dictionnaire. Route séparée et non calcul dans la page : dix-neuf `COUNT(*)` non bornés
 * dans un composant serveur feraient attendre tout l'écran pour une information
 * accessoire — le dictionnaire lui-même ne coûte aucune requête.
 *
 * Cache Redis de 5 minutes. Le volume d'un flux ne bouge pas d'une consultation à l'autre,
 * et le pipeline ne tourne qu'une fois par nuit : recompter à chaque affichage serait payer
 * cher une fraîcheur dont personne n'a besoin.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CLE_CACHE = 'datahub:volumes'
const TTL_S = 300

export async function GET(): Promise<NextResponse<ApiResponse<Volumes>>> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
      { status: 403 },
    )
  }

  // Redis indisponible ne doit pas priver l'admin du comptage : le cache est une
  // optimisation, pas une dépendance.
  try {
    const cache = await redis.get(CLE_CACHE)
    if (cache) {
      return NextResponse.json({
        data: JSON.parse(cache) as Volumes,
        meta: { generated_at: new Date().toISOString() },
      })
    }
  } catch (e) {
    logger.warn('datahub/volumes : lecture du cache impossible', { err: String(e) })
  }

  const volumes = await compterVolumes(prisma as unknown as Record<string, CountDelegate>)

  try {
    await redis.set(CLE_CACHE, JSON.stringify(volumes), 'EX', TTL_S)
  } catch (e) {
    logger.warn('datahub/volumes : écriture du cache impossible', { err: String(e) })
  }

  return NextResponse.json({
    data: volumes,
    meta: { generated_at: new Date().toISOString() },
  })
}
