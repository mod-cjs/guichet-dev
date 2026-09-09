import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'
import { LegalDocument } from '@/components/legal'
import { INFORMATIONS_COLLECTE } from '@/content/legal'

/**
 * `/legal/informations-collecte` — GUIC-607, lien permanent vers la notice.
 * L'affichage « au moment de la collecte » est assuré par `<MentionFormulaire>`.
 */
export const metadata: Metadata = {
  title: INFORMATIONS_COLLECTE.titre,
  description: INFORMATIONS_COLLECTE.resume,
  ...withCanonical('/legal/informations-collecte'),
}

export const dynamic = 'force-static'

export default function InformationsCollectePage() {
  return <LegalDocument document={INFORMATIONS_COLLECTE} />
}
