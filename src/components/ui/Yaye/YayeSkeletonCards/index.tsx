/**
 * YayeSkeletonCards — cartes « fantômes » scintillantes affichées pendant que Yaye
 * cherche des opportunités (outil `searching` en cours), remplacées par les vraies
 * cards à l'arrivée des résultats. Occupe l'utilisateur avec un aperçu de structure.
 */
export function YayeSkeletonCards({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-space-2 self-start w-full" aria-hidden data-testid="yaye-skeleton">
      {/* GUIC-689 — le shimmer visait un token de fond inexistant, si bien que
          seul son fallback hex faisait le travail. Les tokens dédiés au
          squelette existent depuis la fondation v5 : --gj-skel-from/-to. */}
      <style>{`@keyframes yaye-shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
.yaye-sk{background:linear-gradient(90deg,var(--gj-skel-from) 25%,var(--gj-skel-to) 37%,var(--gj-skel-from) 63%);background-size:400px 100%;animation:yaye-shimmer 1.3s linear infinite;border-radius:6px}`}</style>
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
