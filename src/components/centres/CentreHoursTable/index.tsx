export interface CentreHoursTableHoraire {
  jour: string
  ouvert: boolean
  ouvreA?: string | null
  fermeA?: string | null
}

export interface CentreHoursTableProps {
  /** Horaires (idéalement 7 jours Lundi → Dimanche). */
  horaires: CentreHoursTableHoraire[]
  className?: string
}

const JOURS_ORDER = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

function format(h: CentreHoursTableHoraire): string {
  if (!h.ouvert || !h.ouvreA || !h.fermeA) return 'Fermé'
  return `${h.ouvreA} - ${h.fermeA}`
}

/**
 * <CentreHoursTable> — carte "Horaires" listant les 7 jours.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 3.
 * Source design : `public/design-v2/centres-web.jsx` (aside Horaires).
 */
export function CentreHoursTable({
  horaires,
  className = '',
}: CentreHoursTableProps) {
  // Tri stable : ordre Lun → Dim
  const byJour = new Map<string, CentreHoursTableHoraire>()
  for (const h of horaires) byJour.set(h.jour, h)
  const rows = JOURS_ORDER.map(
    (j) =>
      byJour.get(j) ?? { jour: j, ouvert: false, ouvreA: null, fermeA: null },
  )

  return (
    <section
      aria-label="Horaires du centre"
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
        Horaires
      </h3>
      <ul className="m-0 p-0 list-none">
        {rows.map((row, i) => {
          const text = format(row)
          const closed = text === 'Fermé'
          return (
            <li
              key={row.jour}
              className="flex justify-between"
              style={{
                padding: '7px 0',
                borderBottom:
                  i < rows.length - 1 ? '1px solid var(--gj-line)' : 0,
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--gj-grey)', fontWeight: 600 }}>
                {row.jour}
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: closed ? 'var(--gj-grey-2, var(--gj-grey))' : 'var(--gj-ink)',
                }}
              >
                {text}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
