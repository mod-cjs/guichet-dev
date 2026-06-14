'use client'

export interface CentreDescriptionSectionProps {
  /** Texte libre. `null` ou vide → la section ne rend rien. */
  description?: string | null
  className?: string
}

/**
 * <CentreDescriptionSection> — bloc "À propos" du centre.
 *
 * Affiché sur `/centres/[slug]` (Wave 3 — GUIC-393). Préserve les retours
 * ligne du texte source via `whiteSpace: 'pre-line'`. Retourne `null` si
 * la description est vide / absente — ne réserve pas d'espace inutile.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 3.
 */
export function CentreDescriptionSection({
  description,
  className = '',
}: CentreDescriptionSectionProps) {
  const text = description?.trim()
  if (!text) return null

  return (
    <section
      aria-label="À propos du centre"
      className={className}
      style={{
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      <h2
        className="m-0"
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: 'var(--gj-ink)',
          marginBottom: 10,
        }}
      >
        À propos
      </h2>
      <p
        className="m-0"
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          color: 'var(--gj-ink)',
          whiteSpace: 'pre-line',
        }}
      >
        {text}
      </p>
    </section>
  )
}
