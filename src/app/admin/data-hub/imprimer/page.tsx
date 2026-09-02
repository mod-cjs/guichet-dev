import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { DICTIONNAIRE } from '@/lib/datahub/contrat'
import { filtrerDictionnaire, libelleFiltre, type TierFiltre } from '@/lib/datahub/dictionnaire'
import { DictionnaireImprimable } from './DictionnaireImprimable'

export const metadata: Metadata = { title: 'Dictionnaire du Data Hub — impression' }

function lireTier(brut: string | undefined): TierFiltre {
  return brut === 'public' || brut === 'pseudonyme' ? brut : 'tous'
}

/**
 * `/admin/data-hub/imprimer` — vue document du dictionnaire, pour « Enregistrer en PDF ».
 *
 * Route séparée plutôt qu'une feuille de style sur la page principale : imprimer l'écran
 * signifierait imprimer la barre de filtres, les onglets et le bandeau de fraîcheur, qui
 * n'ont aucun sens sur papier. Le document dit ce qu'il est, à quelle date, et sur quel
 * filtre il porte.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string }>
}) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const params = await searchParams
  const requete = params.q ?? ''
  const tier = lireTier(params.tier)

  return (
    <DictionnaireImprimable
      flux={filtrerDictionnaire(DICTIONNAIRE, requete, tier)}
      filtre={libelleFiltre(requete, tier)}
    />
  )
}
