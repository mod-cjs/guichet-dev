/**
 * YayeTypingIndicator — bulle « Yaye est en train d'écrire » (trois points pulsants).
 *
 * Partagé entre la page fullscreen (`YayeChat`) et le drawer (`YayeSidePanel`) pour
 * garantir le MÊME ressenti d'attente sur les deux surfaces (avant le streaming SSE).
 * Accessible : `aria-label` annoncé, `data-testid="yaye-typing"` pour les tests.
 */
export function YayeTypingIndicator() {
  return (
    <div
      data-testid="yaye-typing"
      aria-label="Yaye est en train d'écrire"
      className="inline-flex items-center gap-1 px-space-3 py-space-2 bg-white border border-gj-line text-gj-grey self-start"
      style={{ borderRadius: '12px 12px 12px 4px' }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-gj-grey animate-pulse" />
      <span className="w-1.5 h-1.5 rounded-full bg-gj-grey animate-pulse" style={{ animationDelay: '120ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-gj-grey animate-pulse" style={{ animationDelay: '240ms' }} />
    </div>
  )
}
