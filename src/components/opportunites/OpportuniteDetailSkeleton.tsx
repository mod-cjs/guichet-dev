/**
 * Skeleton du détail d'opportunité — fallback Suspense pour éviter le flash
 * de contenu vide pendant l'hydratation client (GUIC-219).
 */
export function OpportuniteDetailSkeleton() {
  return (
    <div
      data-testid="opportunite-detail-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Chargement du détail de l'opportunité"
      className="flex flex-col gap-space-4 animate-pulse"
    >
      {/* Hero compact */}
      <div className="rounded-gj-md bg-gj-bg h-[180px]" />

      {/* Yaye match card */}
      <div className="rounded-gj-md border border-gj-line h-[80px] bg-gj-bg" />

      {/* Grille détails 2 colonnes */}
      <div className="grid grid-cols-2 gap-space-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-gj-md bg-gj-bg h-[64px]" />
        ))}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-1/3 bg-gj-bg rounded" />
        <div className="h-3 w-full bg-gj-bg rounded" />
        <div className="h-3 w-full bg-gj-bg rounded" />
        <div className="h-3 w-2/3 bg-gj-bg rounded" />
      </div>
    </div>
  )
}
