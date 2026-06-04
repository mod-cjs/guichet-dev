'use client'

import { Icon, type IconName } from '@/components/ui/Icon'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { useObjectifsStep } from '../_logic/use-onboarding-step'
import type { ObjectifId } from '@/lib/onboarding-draft'

interface Props {
  prenom?: string
}

const OBJECTIFS: ReadonlyArray<{
  id:     ObjectifId
  icon:   IconName
  label:  string
  sub:    string
  accent: 'teal' | 'yellow' | 'blue' | 'green'
}> = [
  { id: 'emploi',      icon: 'employment',  label: 'Trouver un emploi / stage',         sub: '850 opps actives · CDI, CDD, stages',         accent: 'teal'   },
  { id: 'projet',      icon: 'project',     label: 'Lancer mon projet',                  sub: 'Financements, accompagnement, incubation',    accent: 'yellow' },
  { id: 'formation',   icon: 'learning',    label: 'Me former',                          sub: "Bourses d'études, cursus, certifications",    accent: 'blue'   },
  { id: 'agriculture', icon: 'agriculture', label: "Travailler dans l'agriculture", sub: 'Maraîchage, élevage, transformation',         accent: 'green'  },
  { id: 'engagement',  icon: 'engagement',  label: "M'engager dans une cause",      sub: 'Volontariat, civisme, solidarité',            accent: 'teal'   },
]

function tileBg(accent: 'teal' | 'yellow' | 'blue' | 'green'): string {
  return `var(--gj-${accent}-soft)`
}
function tileColor(accent: 'teal' | 'yellow' | 'blue' | 'green'): string {
  return accent === 'yellow' ? 'var(--gj-yellow-ink)' : `var(--gj-${accent})`
}

/**
 * Onboarding écran 3/5 — version WEB.
 *
 * Carte centrée 900px, Yaye bar gradient, grille 2 colonnes avec 5 options.
 * Footer fixé en bas de la carte avec compteur + boutons Passer / Continuer.
 * Conforme `design-guichet-v2/web-onboarding.jsx#WebOnboard3Goal`.
 */
export function OnboardingObjectifsWeb({ prenom }: Props) {
  const { selected, count, toggle, next, skip } = useObjectifsStep()
  const greeting = prenom ? `Salama ${prenom} — c'est Yaye.` : "Salama Awa — c'est Yaye."

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-bg)' }}>
      <div
        className="flex-1 flex flex-col items-center"
        style={{ padding: '48px 24px 40px', overflowY: 'auto' }}
      >
        <div
          className="flex flex-col"
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 18,
            padding: '40px 56px',
            width: 'min(900px, 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,.04)',
            gap: 24,
          }}
        >
          <div
            className="flex gap-3 items-center"
            style={{
              background: 'linear-gradient(135deg, var(--gj-teal-soft), var(--gj-surface))',
              border: '1.5px solid var(--gj-line)',
              borderRadius: 14,
              padding: 18,
            }}
          >
            <YayeAvatar size={48} withBadge />
            <div>
              <div className="font-black text-gj-teal-deep" style={{ fontSize: 14 }}>{greeting}</div>
              <div className="text-gj-grey" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>
                Dis-moi ce qui t&apos;intéresse pour que je te propose les bonnes opportunités.
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-black text-color-text-primary text-fs-700" style={{ lineHeight: 1.15, letterSpacing: '-.4px' }}>
              C&apos;est quoi ton objectif&nbsp;?
            </h2>
            <p className="text-gj-grey" style={{ fontSize: 13.5, marginTop: 6 }}>
              Coche un ou plusieurs choix. Tu pourras tout changer plus tard.
            </p>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: '1fr 1fr' }}
            role="group"
            aria-label="Tes objectifs"
          >
            {OBJECTIFS.map(o => {
              const on = selected.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  aria-pressed={on}
                  className="flex items-center gap-3 text-left w-full"
                  style={{
                    background: on ? 'rgba(0,159,118,.04)' : 'var(--gj-surface)',
                    border: `1.5px solid ${on ? 'var(--gj-teal)' : 'var(--gj-line)'}`,
                    borderRadius: 12,
                    padding: 18,
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 48, height: 48, borderRadius: 10,
                      background: tileBg(o.accent),
                      color: tileColor(o.accent),
                    }}
                  >
                    <Icon name={o.icon} size={22} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-black" style={{ fontSize: 14.5 }}>{o.label}</span>
                    <span className="block text-gj-grey" style={{ fontSize: 11.5, marginTop: 2, lineHeight: 1.4 }}>
                      {o.sub}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 24, height: 24, borderRadius: 6,
                      border: `1.5px solid ${on ? 'var(--gj-teal)' : 'var(--gj-line)'}`,
                      background: on ? 'var(--gj-teal)' : 'var(--gj-surface)',
                      color: '#fff',
                    }}
                  >
                    {on ? <Icon name="check" size={14} /> : null}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            className="flex justify-between items-center"
            style={{ paddingTop: 12, borderTop: '1px solid var(--gj-line)' }}
          >
            <span className="text-gj-grey" style={{ fontSize: 13 }}>
              <b style={{ color: 'var(--gj-teal-deep)' }}>{count} sélectionné{count > 1 ? 's' : ''}</b>
              {' · tu peux en choisir plus'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { void skip() }}
                className="font-bold"
                style={{
                  background: 'var(--gj-surface)',
                  color: 'var(--gj-grey)',
                  border: '1.5px solid var(--gj-line)',
                  padding: '0 22px',
                  minHeight: 50,
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Passer
              </button>
              <button
                type="button"
                onClick={() => { void next() }}
                className="inline-flex items-center gap-1 font-black"
                style={{
                  background: 'var(--gj-teal-deep)',
                  color: 'var(--gj-surface)',
                  border: 0,
                  padding: '0 24px',
                  minHeight: 50,
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Continuer
                <Icon name="arrow-right" size={14} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
