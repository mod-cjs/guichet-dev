'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

export interface CentreEvenementSummary {
  id: string
  titre: string
  type: string
  /** ISO string. */
  dateDebut: string
  /** ISO string ou null. */
  dateFin: string | null
  lieu: string
}

export interface CentreEvenementsSectionProps {
  evenements: CentreEvenementSummary[]
  /** Slug du centre — utilisé pour le CTA "voir tous". */
  centreSlug: string
  className?: string
}

const TYPE_LABELS: Record<string, string> = {
  Formation: 'Formation',
  Atelier: 'Atelier',
  Forum: 'Forum',
  Webinar: 'Webinar',
  Conference: 'Conférence',
}

function formatDayMonth(iso: string): { jour: string; mois: string } {
  const d = new Date(iso)
  const jour = String(d.getDate()).padStart(2, '0')
  const mois = d
    .toLocaleString('fr-FR', { month: 'short' })
    .replace('.', '')
    .toUpperCase()
  return { jour, mois }
}

/**
 * <CentreEvenementsSection> — liste compacte "Événements à venir au centre".
 *
 * Affiche jusqu'à 5 événements (filtrés `statut=a_venir` côté loader).
 * Chaque ligne : pastille date (jour + mois), titre, badge type, lieu, et
 * lien vers `/agenda/[id]` (le modèle Evenement n'a pas de `slug` — on
 * raccordera quand M5 l'ajoutera).
 *
 * Wave 3 (GUIC-393). Spec : `.agent_context/specs/M4-centres-lot7.md` §5.
 */
export function CentreEvenementsSection({
  evenements,
  centreSlug,
  className = '',
}: CentreEvenementsSectionProps) {
  const empty = evenements.length === 0

  return (
    <section
      aria-label="Événements à venir au centre"
      className={className}
      style={{
        background: 'var(--gj-surface)',
        border: '1.5px solid var(--gj-line)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        className="flex items-baseline justify-between"
        style={{ marginBottom: 14 }}
      >
        <h2
          className="m-0"
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: 'var(--gj-ink)',
          }}
        >
          Événements à venir au centre
        </h2>
        {!empty && (
          <Link
            href={`/agenda?centre=${encodeURIComponent(centreSlug)}`}
            style={{
              fontSize: 12.5,
              color: 'var(--gj-teal-deep)',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Tout voir →
          </Link>
        )}
      </div>

      {empty ? (
        <p
          className="m-0"
          style={{
            fontSize: 13,
            color: 'var(--gj-grey)',
            fontStyle: 'italic',
          }}
        >
          Aucun événement prévu pour le moment. Reviens bientôt !
        </p>
      ) : (
        <>
          <ul
            className="flex flex-col m-0 p-0 list-none"
            style={{ gap: 10 }}
          >
            {evenements.map((e) => {
              const { jour, mois } = formatDayMonth(e.dateDebut)
              const typeLabel = TYPE_LABELS[e.type] ?? e.type
              return (
                <li key={e.id}>
                  <Link
                    href={`/agenda/${e.id}`}
                    className="flex items-center"
                    aria-label={`${e.titre} — ${jour} ${mois}`}
                    style={{
                      gap: 12,
                      padding: 10,
                      borderRadius: 10,
                      border: '1.5px solid var(--gj-line)',
                      background: 'var(--gj-bg)',
                      textDecoration: 'none',
                      minHeight: 44,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: 'var(--gj-teal-soft)',
                        color: 'var(--gj-teal-deep)',
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 900 }}>{jour}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          marginTop: 2,
                        }}
                      >
                        {mois}
                      </span>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: 'var(--gj-ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {e.titre}
                      </div>
                      <div
                        className="flex items-center"
                        style={{
                          gap: 8,
                          marginTop: 4,
                          fontSize: 12,
                          color: 'var(--gj-grey)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            color: 'var(--gj-teal-deep)',
                            background: 'var(--gj-teal-soft)',
                            padding: '2px 8px',
                            borderRadius: 999,
                          }}
                        >
                          {typeLabel}
                        </span>
                        {e.lieu && (
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {e.lieu}
                          </span>
                        )}
                      </div>
                    </div>
                    <Icon
                      name="chevron-right"
                      size={16}
                      style={{ color: 'var(--gj-grey)', flexShrink: 0 }}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
          <Link
            href={`/agenda?centre=${encodeURIComponent(centreSlug)}`}
            className="inline-flex items-center justify-center"
            style={{
              marginTop: 14,
              width: '100%',
              minHeight: 44,
              borderRadius: 10,
              border: '1.5px solid var(--gj-teal-deep)',
              color: 'var(--gj-teal-deep)',
              background: 'var(--gj-surface)',
              fontWeight: 800,
              fontSize: 13,
              textDecoration: 'none',
              gap: 6,
            }}
          >
            Voir tous les événements
            <Icon name="arrow-right" size={14} />
          </Link>
        </>
      )}
    </section>
  )
}
