/**
 * YayeSkeletonCards — cartes « fantômes » scintillantes affichées pendant que Yaye
 * cherche des opportunités (outil `searching` en cours), remplacées par les vraies
 * cards à l'arrivée des résultats. Occupe l'utilisateur avec un aperçu de structure.
 */
export function YayeSkeletonCards({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-space-2 self-start w-full" aria-hidden data-testid="yaye-skeleton">
      <style>{`@keyframes yaye-shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
.yaye-sk{background:linear-gradient(90deg,var(--gj-bg-soft,#eef1f0) 25%,#f6f8f7 37%,var(--gj-bg-soft,#eef1f0) 63%);background-size:400px 100%;animation:yaye-shimmer 1.3s linear infinite;border-radius:6px}`}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gj-line"
          style={{ borderRadius: 12, padding: 12, maxWidth: '85%' }}
        >
          <div className="yaye-sk" style={{ height: 12, width: '70%', marginBottom: 8 }} />
          <div className="yaye-sk" style={{ height: 10, width: '45%', marginBottom: 10 }} />
          <div className="flex gap-2">
            <div className="yaye-sk" style={{ height: 18, width: 64, borderRadius: 999 }} />
            <div className="yaye-sk" style={{ height: 18, width: 48, borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
