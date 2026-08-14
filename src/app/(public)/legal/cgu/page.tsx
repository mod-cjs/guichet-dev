import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'
import { LegalDocument } from '@/components/legal'
import { CGU } from '@/content/legal'

/**
 * `/legal/cgu` — reprise du contenu GUIC-233 dans le modèle typé.
 *
 * GUIC-233 qualifiait lui-même ce texte de « version provisoire, à compléter
 * par le service juridique » : `estCoquille` reste donc vrai, et avec lui le
 * `robots: noindex` — un texte provisoire n'a pas à remonter en recherche
 * comme s'il faisait foi.
 */
export const metadata: Metadata = {
  title: CGU.titre,
  description: CGU.resume,
  ...withCanonical('/legal/cgu'),
  robots: { index: false, follow: true },
}

export const dynamic = 'force-static'

export default function CguPage() {
  return <LegalDocument document={CGU} />
}
