export interface CentreServicesGridProps {
  /** Valeurs depuis enum `CentreService` (ou strings libres). */
  services: string[]
  className?: string
}

/**
 * Mapping enum → label lisible.
 *
 * Liste alignée avec `enum CentreService` (spec §3.1) + alias tolérants
 * pour les strings libres rencontrées (legacy Wave 2 fallback).
 */
const SERVICE_LABELS: Record<string, string> = {
  WiFi: 'Wi-Fi',
  Wifi: 'Wi-Fi',
  Bibliotheque: 'Bibliothèque',
  Coworking: 'Coworking',
  Ateliers: 'Ateliers',
  Conseiller: 'Conseil 1-à-1',
  Salle_reunion: 'Salle de réunion',
  Postes_info: 'Postes informatiques',
  Imprimante: 'Imprimante',
  Cafe: 'Café',
  Espace_detente: 'Espace détente',
}

export function formatServiceLabel(raw: string): string {
  return SERVICE_LABELS[raw] ?? raw.replace(/_/g, ' ')
}

/**
 * <CentreServicesGrid> — carte "Services sur place" avec chips wrap.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 3.
 * Source design : `public/design-v2/centres-web.jsx` (aside Services).
 */
export function CentreServicesGrid({
  services,
  className = '',
}: CentreServicesGridProps) {
  return (
    <section
      aria-label="Services sur place"
      className={className}
      style={{
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3
        className="m-0"
        style={{
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 10,
          color: 'var(--gj-teal-deep)',
        }}
      >
        Services sur place
      </h3>
      {services.length === 0 ? (
        <p
          className="m-0"
          style={{ fontSize: 13, color: 'var(--gj-grey)', fontStyle: 'italic' }}
        >
          Aucun service renseigné.
        </p>
      ) : (
        <ul
          className="flex flex-wrap m-0 p-0 list-none"
          style={{ gap: 7 }}
          aria-label="Liste des services"
        >
          {services.map((s) => (
            <li
              key={s}
              className="inline-flex items-center rounded-full"
              style={{
                background: 'var(--gj-bg)',
                color: 'var(--gj-ink)',
                border: '1px solid var(--gj-line)',
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {formatServiceLabel(s)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
