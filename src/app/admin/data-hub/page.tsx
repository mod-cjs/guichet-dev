import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { resumerFraicheur } from '@/lib/datahub/fraicheur'
import { type TierFiltre } from '@/lib/datahub/dictionnaire'
import { DICTIONNAIRE } from '@/lib/datahub/contrat'
import { DictionnaireClient } from './DictionnaireClient'

export const metadata: Metadata = { title: 'Data Hub — Admin CJS' }

/** Un `tier` inconnu dans l'URL retombe sur la vue complète plutôt que sur un écran vide. */
function lireTier(brut: string | undefined): TierFiltre {
  return brut === 'public' || brut === 'pseudonyme' ? brut : 'tous'
}

/**
 * `/admin/data-hub` — le dictionnaire du Data Hub.
 *
 * Le contrat d'export ne coûte aucune requête : il est figé pour la durée d'un déploiement. Les
 * statistiques du réseau, qui occupaient cette route sans rapport avec son nom, vivent
 * désormais sous `/admin/statistiques`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string }>
}) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const params = await searchParams

  // Une seule ligne, sur un index : le dictionnaire lui-même ne coûte aucune requête, et
  // celle-ci répond à la première question que pose un administrateur devant des chiffres.
  const dernierRun = await prisma.datahubRun.findFirst({ orderBy: { termineA: 'desc' } })

  return (
    <DictionnaireClient
      flux={DICTIONNAIRE}
      requeteInitiale={params.q ?? ''}
      tierInitial={lireTier(params.tier)}
      fraicheur={resumerFraicheur(dernierRun, new Date())}
    />
  )
}
