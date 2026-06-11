import { OpportuniteDetailSkeleton } from '@/components/opportunites/OpportuniteDetailSkeleton'

/**
 * Loading UI Next.js — affiché pendant le RSC render de
 * `/opportunites/[slug]` (GUIC-367, latence détail opportunité).
 *
 * Le détail charge plusieurs ressources (Prisma `getOpportuniteDetail` +
 * `incrementVue`) ; sans `loading.tsx`, le clic depuis la liste reste figé
 * sur la page précédente, donnant l'impression que rien ne se passe.
 */
export default function Loading() {
  return (
    <div className="container-page py-space-6 max-w-[var(--gj-container-md)]">
      <div className="h-4 w-40 bg-gj-bg rounded animate-pulse" />
      <div className="mt-space-3">
        <OpportuniteDetailSkeleton />
      </div>
    </div>
  )
}
