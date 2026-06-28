/**
 * YayeTypingIndicator — indicateur « Yaye réfléchit » de marque (vague teal animée)
 * + libellé contextuel optionnel (« Yaye cherche des opportunités… »).
 *
 * Partagé page fullscreen (`YayeChat`) ↔ drawer (`YayeSidePanel`) → même ressenti
 * d'attente. `label` est piloté par les événements `tool` du streaming (tool-labels.ts).
 * Accessible : `aria-live`, `data-testid="yaye-typing"`.
 */
export function YayeTypingIndicator({ label }: { label?: string }) {
  return (
    <div
      data-testid="yaye-typing"
      aria-label={label ?? "Yaye est en train d'écrire"}
      // Pas d'aria-live ici : l'annonce SR est portée par la région `announce` dédiée
      // (YayeChat/YayeSidePanel). Doubler la live-region rebavarderait à chaque label.
      className="inline-flex items-center gap-2 px-space-3 py-space-2 bg-white border border-gj-line self-start"
      style={{ borderRadius: '12px 12px 12px 4px' }}
    >
      <style>{`@keyframes yaye-wave{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-4px);opacity:1}}`}</style>
      <span className="inline-flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--gj-teal-deep)',
              animation: `yaye-wave 1.1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </span>
      {label && <span className="text-fs-100 text-gj-grey font-semibold">{label}…</span>}
    </div>
  )
}
