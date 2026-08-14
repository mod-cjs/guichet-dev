import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'
import { LegalDocument } from '@/components/legal'
import { MENTIONS_LEGALES } from '@/content/legal'

/**
 * `/legal/mentions-legales` — reprise de GUIC-233 dans le modèle typé,
 * enrichie de l'identité d'éditeur de l'Article 1 (NINEA, adresse, téléphone,
 * représentant légal) que GUIC-233 signalait « à compléter ».
 */
export const metadata: Metadata = {
  title: MENTIONS_LEGALES.titre,
  description: MENTIONS_LEGALES.resume,
  ...withCanonical('/legal/mentions-legales'),
}

export const dynamic = 'force-static'

export default function MentionsLegalesPage() {
  return <LegalDocument document={MENTIONS_LEGALES} />
}
