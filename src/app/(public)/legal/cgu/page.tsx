import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'
import { LegalDocument } from '@/components/legal'
import { CGU } from '@/content/legal'

/**
 * `/legal/cgu` — CGU complétées le 2026-08-14 (les 4 sections provisoires de
 * GUIC-233 sont conservées et étendues à l'ensemble des services rendus).
 *
 * Le `robots: noindex` posé tant que le texte était provisoire est retiré :
 * le document fait désormais foi. Sa validation juridique reste à obtenir,
 * cf. l'en-tête de `src/content/legal/cgu.ts`.
 */
export const metadata: Metadata = {
  title: CGU.titre,
  description: CGU.resume,
  ...withCanonical('/legal/cgu'),
}

export const dynamic = 'force-static'

export default function CguPage() {
  return <LegalDocument document={CGU} />
}
