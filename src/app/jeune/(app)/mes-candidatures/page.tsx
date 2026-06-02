import type { Metadata } from 'next'
import { CandidaturesClient, CANDIDATURES_MOCK } from '@/components/candidatures'

export const metadata: Metadata = { title: 'Mes candidatures' }

/**
 * GUIC-190 — Pipeline candidatures mobile (Phase 2B/4).
 *
 * Source des données : mock front (cf. src/components/candidatures/mock-data.ts)
 * tant que le schéma Prisma `StatutCandidature` n'est pas étendu aux 5 étapes
 * (Brouillon / Envoyée / En revue / Entretien / Décision). Loader réel à
 * brancher en Phase 4 — la signature côté composant client reste stable.
 */
export default function MesCandidaturesPage() {
  return (
    <div>
      <div className="mb-space-4">
        <h1 className="text-fs-800 font-black text-color-text-primary">Mes candidatures</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Suivi de vos candidatures aux opportunités
        </p>
      </div>
      <CandidaturesClient items={CANDIDATURES_MOCK} />
    </div>
  )
}
