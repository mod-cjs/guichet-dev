import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Skeleton de chargement de l'espace conseiller — évite l'écran figé pendant
 * les requêtes (contexte terrain / réseau lent). GUIC-470.
 */
export default function ConseillerLoading() {
  return (
    <div className="flex flex-col gap-space-5" aria-busy="true" aria-live="polite">
      {/* En-tête */}
      <div className="flex flex-col gap-space-2">
        <Skeleton height="26px" width="240px" />
        <Skeleton height="14px" width="320px" />
      </div>

      {/* KPI */}
      <div className="grid gap-space-3 grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-gj-lg p-space-4" style={{ border: '1.5px solid var(--gj-line)', minHeight: 118 }}>
            <Skeleton height="38px" width="38px" rounded="10px" className="mb-space-3" />
            <Skeleton height="26px" width="56px" className="mb-space-2" />
            <Skeleton height="12px" width="80%" />
          </div>
        ))}
      </div>

      {/* Deux blocs */}
      <div className="grid gap-space-5 grid-cols-1 lg:grid-cols-[1.5fr_1fr]">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
            <Skeleton height="18px" width="45%" className="mb-space-4" />
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="flex items-center gap-space-3 py-space-3">
                <Skeleton height="38px" width="38px" rounded="9px" />
                <div className="flex-1">
                  <Skeleton height="13px" width="70%" className="mb-space-1" />
                  <Skeleton height="11px" width="50%" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
