import { Icon, type IconName } from '@/components/ui/Icon'
import type { UsageCarteCJS } from '@/lib/loaders/centres'

export interface MesUsagesGridProps {
  usages: UsageCarteCJS[]
  className?: string
}

/**
 * Renvoie l'icône représentative d'un usage (réservation ressource ou check-in).
 */
function iconFor(usage: UsageCarteCJS): IconName {
  if (usage.type === 'checkin') return 'check-circle'
  const nom = (usage.ressourceNom ?? '').toLowerCase()
  if (nom.includes('salle')) return 'home'
  if (nom.includes('véhicule') || nom.includes('vehicule') || nom.includes('voiture'))
    return 'car'
  if (nom.includes('poste') || nom.includes('info') || nom.includes('ordi'))
    return 'desktop'
  return 'pin'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function labelFor(usage: UsageCarteCJS): string {
  if (usage.type === 'checkin') return 'Check-in'
  return usage.ressourceNom ?? 'Réservation'
}

/**
 * <MesUsagesGrid> — grid 2 cols mobile / 3 desktop des derniers usages
 * "réussis" du jeune (réservations validées + check-ins).
 *
 * Empty state si aucun usage. Tokens `gj-*` exclusivement.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 6 / GUIC-386.
 */
export function MesUsagesGrid({ usages, className = '' }: MesUsagesGridProps) {
  if (usages.length === 0) {
    return (
      <div
        data-testid="mes-usages-empty"
        className={className}
        style={{
          padding: 20,
          textAlign: 'center',
          border: '1.5px dashed var(--gj-line)',
          borderRadius: 12,
          background: 'var(--gj-bg)',
          color: 'var(--gj-grey)',
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: 800, color: 'var(--gj-ink)' }}>
          Aucun usage pour le moment
        </div>
        Présente ta carte CJS à l’accueil d’un centre pour démarrer.
      </div>
    )
  }

  return (
    <ul
      data-testid="mes-usages-grid"
      className={`grid grid-cols-2 lg:grid-cols-3 gap-3 ${className}`.trim()}
      style={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {usages.map((u) => (
        <li
          key={`${u.type}-${u.id}`}
          data-testid={`usage-item-${u.type}`}
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minHeight: 'var(--tap-min, 44px)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'var(--gj-teal-soft)',
                color: 'var(--gj-teal-deep)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name={iconFor(u)} size={16} />
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--gj-ink)',
                lineHeight: 1.2,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {labelFor(u)}
            </span>
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--gj-grey)',
              lineHeight: 1.3,
            }}
          >
            {u.centreNom || 'Centre CJS'}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span style={{ fontSize: 11, color: 'var(--gj-grey)' }}>
              {formatDate(u.date)}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '.3px',
                color:
                  u.type === 'checkin'
                    ? 'var(--gj-green)'
                    : 'var(--gj-teal-deep)',
              }}
            >
              {u.statut}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
