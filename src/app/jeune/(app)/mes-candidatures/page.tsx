import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadMesCandidatures } from '@/lib/loaders/mes-candidatures'
import { CandidaturesClient } from '@/components/candidatures'
import { PageHeader } from '@/components/ui'

export const metadata: Metadata = { title: 'Mes candidatures' }
export const dynamic = 'force-dynamic'

/**
 * GUIC-237 — branche la page sur Prisma via `loadMesCandidatures(cjsUid)`.
 *
 * Remplace `CANDIDATURES_MOCK` (GUIC-190 / Phase 2B). Mapping statuts DB →
 * étapes pipeline UI documenté dans `src/lib/loaders/mes-candidatures.ts`.
 *
 * Le mock reste exporté depuis `@/components/candidatures` pour Storybook et
 * tests unitaires existants — pas de régression côté catalogue UI.
 */
export default async function MesCandidaturesPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const items = await loadMesCandidatures(session.cjsUid)

  return (
    <div>
      <PageHeader
        title="Mes candidatures"
        subtitle="Suivi de vos candidatures aux opportunités"
      />
      <CandidaturesClient items={items} />
    </div>
  )
}
