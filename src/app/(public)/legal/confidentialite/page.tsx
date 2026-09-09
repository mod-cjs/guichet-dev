import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'
import { LegalDocument } from '@/components/legal'
import { CONFIDENTIALITE } from '@/content/legal'

/**
 * `/legal/confidentialite` — GUIC-606.
 *
 * Remplace la coquille GUIC-233 (4 sections) par le document officiel du
 * responsable données (11 articles, Mars 2026).
 * Spec : `.agent_context/specs/GUIC-605-conformite-cdp-legal.md`.
 */
export const metadata: Metadata = {
  title: CONFIDENTIALITE.titre,
  description: CONFIDENTIALITE.resume,
  ...withCanonical('/legal/confidentialite'),
}

export const dynamic = 'force-static'

export default function ConfidentialitePage() {
  return <LegalDocument document={CONFIDENTIALITE} />
}
