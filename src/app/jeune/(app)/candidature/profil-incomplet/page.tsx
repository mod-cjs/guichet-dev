/**
 * Page intermédiaire "Profil incomplet" — GUIC-380.
 *
 * Affichée quand l'API /api/candidatures retourne 403 PROFILE_INCOMPLETE.
 * La modale candidature se ferme et l'utilisateur est routé ici avec :
 *   - `opp` : opportuniteId pour retour
 *   - `missing` : CSV des champs manquants (email, telephone, niveauEtude, situationEmploi, cv)
 *
 * Affiche une checklist visuelle de tous les champs profil requis + CTA
 * d'édition. Évite la duplication formulaire dans la modale candidature.
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadProfilComplet } from '@/lib/profil-loader'
import { ProfilIncompletClient } from './profil-incomplet-client'

export const metadata = {
  title: 'Complète ton profil — Guichet Jeunesse',
}

interface SearchParams {
  opp?: string
  missing?: string
}

export default async function ProfilIncompletPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const profil = await loadProfilComplet(session.cjsUid)
  if (!profil) redirect('/auth/connexion')

  const sp = await searchParams
  const oppId = sp.opp ?? null
  const missing = (sp.missing ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <ProfilIncompletClient
      profil={profil}
      missing={missing}
      opportuniteId={oppId}
    />
  )
}
