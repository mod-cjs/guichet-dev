import type { Metadata } from 'next'
import { GestionCookies } from '@/components/consent/GestionCookies'
import { LegalDocument } from '@/components/legal'
import { COOKIES } from '@/content/legal'
import { withCanonical } from '@/lib/seo/metadata'

/**
 * `/legal/cookies` — GUIC-712.
 *
 * Porte d'entrée universelle vers les préférences. Le pied de page ne s'affiche que sur
 * les pages publiques : depuis `/jeune/*`, `/conseiller/*` ou `/recruteur/*`, cette URL
 * est le seul chemin vers la révocation. Elle doit donc rester publique et stable.
 */
export const metadata: Metadata = {
  title: COOKIES.titre,
  description: COOKIES.resume,
  ...withCanonical('/legal/cookies'),
}

export default function CookiesPage() {
  return (
    <>
      <LegalDocument document={COOKIES} />
      <div className="container-page pb-space-7">
        <GestionCookies />
      </div>
    </>
  )
}

export const dynamic = 'force-static'
