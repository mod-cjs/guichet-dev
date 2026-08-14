import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'
import { LegalDocument } from '@/components/legal'
import { VOS_DROITS } from '@/content/legal'

/**
 * `/legal/vos-droits` — GUIC-605.
 *
 * Page rédigée par le responsable données (doc « Textes de consentement » §4).
 * C'est le document que l'utilisateur doit avoir à disposition pour exercer
 * ses droits d'accès, rectification, opposition et effacement.
 */
export const metadata: Metadata = {
  title: VOS_DROITS.titre,
  description: VOS_DROITS.resume,
  ...withCanonical('/legal/vos-droits'),
}

export const dynamic = 'force-static'

export default function VosDroitsPage() {
  return <LegalDocument document={VOS_DROITS} />
}
