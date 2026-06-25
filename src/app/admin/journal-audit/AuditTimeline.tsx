import { Icon, type IconName } from '@/components/ui/Icon'

export interface AuditRow {
  id: string
  /** Nom de l'acteur (résolu) ou identifiant court. */
  actor: string
  /** Phrase d'action humanisée (« a approuvé une publication »). */
  actionText: string
  /** Complément cible éventuel (« sur la fiche de Awa Diop »). */
  targetText: string | null
  /** Horodatage formaté fr-FR. */
  when: string
  tone: 'green' | 'red' | 'blue' | 'grey'
  icon: IconName
}

const TONE: Record<AuditRow['tone'], { bg: string; fg: string }> = {
  green: { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green)' },
  red: { bg: 'var(--gj-red-soft, #FCE8E8)', fg: 'var(--gj-red)' },
  blue: { bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-deep)' },
  grey: { bg: 'var(--gj-bg)', fg: 'var(--gj-grey)' },
}

/**
 * AuditTimeline — rendu read-only du journal d'audit (G3, gap Lot 11).
 * Présentational : aucune interaction, supervision seule.
 */
export function AuditTimeline({ rows, total }: { rows: AuditRow[]; total: number }) {
  return (
    <div style={{ padding: '22px 28px 40px', overflowY: 'auto', flex: 1 }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>
          Journal d’audit
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3, marginBottom: 18 }}>
          Traçabilité des actions sensibles (consultation de données personnelles, modération).
          {total > rows.length
            ? ` ${rows.length} événements les plus récents sur ${total.toLocaleString('fr-FR')}.`
            : ` ${rows.length.toLocaleString('fr-FR')} événement(s).`}
        </p>

        {rows.length === 0 ? (
          <div
            style={{
              padding: '48px 18px',
              textAlign: 'center',
              color: 'var(--gj-grey)',
              fontSize: 14,
              background: 'var(--gj-surface)',
              border: '1.5px solid var(--gj-line)',
              borderRadius: 14,
            }}
          >
            <Icon name="document" size={40} style={{ color: 'var(--gj-line-strong)', display: 'block', margin: '0 auto 12px' }} />
            Aucun événement d’audit pour l’instant.
          </div>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rows.map((r) => {
              const tone = TONE[r.tone]
              return (
                <li
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'var(--gj-surface)',
                    border: '1px solid var(--gj-line)',
                    borderRadius: 12,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      flexShrink: 0,
                      background: tone.bg,
                      color: tone.fg,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={r.icon} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--gj-ink)', lineHeight: 1.45 }}>
                      <strong style={{ fontWeight: 800 }}>{r.actor}</strong> {r.actionText}
                      {r.targetText ? <span style={{ color: 'var(--gj-grey)' }}> {r.targetText}</span> : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 2 }}>{r.when}</div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
