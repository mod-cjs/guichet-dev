'use client'

import { Icon } from '@/components/ui/Icon'

export interface CentreEquipeAgent {
  id: string
  prenom: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  role: string
  photoUrl: string | null
  domainesExpertise: string[]
}

export interface CentreEquipeSectionProps {
  agents: CentreEquipeAgent[]
  className?: string
}

const ROLE_LABELS: Record<string, string> = {
  conseiller: 'Conseiller·e',
  directeur: 'Direction',
  admin_centre: 'Admin centre',
}

function fullName(a: CentreEquipeAgent): string {
  const composed = [a.prenom, a.nom].filter(Boolean).join(' ').trim()
  return composed.length > 0 ? composed : 'Membre de l’équipe'
}

function initiales(a: CentreEquipeAgent): string {
  const p = (a.prenom?.[0] ?? '').toUpperCase()
  const n = (a.nom?.[0] ?? '').toUpperCase()
  const out = `${p}${n}`
  return out.length > 0 ? out : '?'
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

/**
 * <CentreEquipeSection> — bloc "Notre équipe" sur `/centres/[slug]`.
 *
 * Grid responsive (1 col mobile / 2 sm / 3 lg) listant les conseillers
 * rattachés au centre. Avatar à initiales, badge rôle, chips expertises,
 * et CTAs contact si email/téléphone disponibles.
 *
 * Wave 3 (GUIC-393). Spec : `.agent_context/specs/M4-centres-lot7.md` §5.
 */
export function CentreEquipeSection({
  agents,
  className = '',
}: CentreEquipeSectionProps) {
  return (
    <section
      aria-label="Notre équipe"
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
          marginBottom: 14,
        }}
      >
        Notre équipe
      </h2>

      {agents.length === 0 ? (
        <p
          className="m-0"
          style={{
            fontSize: 13,
            color: 'var(--gj-grey)',
            fontStyle: 'italic',
          }}
        >
          Aucun conseiller référencé pour le moment.
        </p>
      ) : (
        <ul
          className="grid m-0 p-0 list-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          style={{ gap: 12 }}
        >
          {agents.map((a) => {
            const name = fullName(a)
            return (
              <li
                key={a.id}
                style={{
                  border: '1.5px solid var(--gj-line)',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: 'var(--gj-bg)',
                }}
              >
                <div className="flex items-center" style={{ gap: 12 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--gj-teal-deep)',
                      color: 'var(--gj-surface)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {initiales(a)}
                  </span>
                  <div style={{ minWidth: 0 }}>
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
                      {name}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 4,
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: 'var(--gj-teal-deep)',
                        background: 'var(--gj-teal-soft)',
                        padding: '2px 8px',
                        borderRadius: 999,
                        textTransform: 'uppercase',
                        letterSpacing: '.3px',
                      }}
                    >
                      {roleLabel(a.role)}
                    </span>
                  </div>
                </div>

                {a.domainesExpertise.length > 0 && (
                  <div className="flex flex-wrap" style={{ gap: 6 }}>
                    {a.domainesExpertise.map((d) => (
                      <span
                        key={d}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--gj-grey)',
                          background: 'var(--gj-surface)',
                          border: '1px solid var(--gj-line)',
                          padding: '3px 9px',
                          borderRadius: 999,
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}

                {(a.email || a.telephone) && (
                  <div className="flex" style={{ gap: 8 }}>
                    {a.telephone && (
                      <a
                        href={`tel:${a.telephone}`}
                        aria-label={`Appeler ${name}`}
                        className="inline-flex items-center justify-center"
                        style={{
                          flex: 1,
                          gap: 6,
                          minHeight: 44,
                          padding: '0 12px',
                          borderRadius: 9,
                          border: '1.5px solid var(--gj-line)',
                          background: 'var(--gj-surface)',
                          color: 'var(--gj-teal-deep)',
                          fontSize: 12.5,
                          fontWeight: 800,
                          textDecoration: 'none',
                        }}
                      >
                        <Icon name="phone" size={14} />
                        Appeler
                      </a>
                    )}
                    {a.email && (
                      <a
                        href={`mailto:${a.email}`}
                        aria-label={`Envoyer un email à ${name}`}
                        className="inline-flex items-center justify-center"
                        style={{
                          flex: 1,
                          gap: 6,
                          minHeight: 44,
                          padding: '0 12px',
                          borderRadius: 9,
                          border: '1.5px solid var(--gj-line)',
                          background: 'var(--gj-surface)',
                          color: 'var(--gj-teal-deep)',
                          fontSize: 12.5,
                          fontWeight: 800,
                          textDecoration: 'none',
                        }}
                      >
                        <Icon name="mail" size={14} />
                        Email
                      </a>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
