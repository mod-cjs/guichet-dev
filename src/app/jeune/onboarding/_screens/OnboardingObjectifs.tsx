'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/Icon'
import { StepBar } from '@/components/ui/StepBar'
import { FooterCTA } from '@/components/ui/FooterCTA'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { patchDraft, readDraft, type ObjectifId } from '@/lib/onboarding-draft'

interface Props {
  prenom?: string
}

/**
 * Mapping objectifs → icônes du sprite Guichet.
 *
 * Choix d'icônes (non parfaits — voir commit body) :
 * - emploi      → `employment` (parfait)
 * - projet      → `project`    (parfait)
 * - formation   → `learning`   (parfait, alias éducation)
 * - agriculture → `agriculture` (parfait)
 * - engagement  → `engagement` (parfait, alias volontariat)
 */
const OBJECTIFS: ReadonlyArray<{
  id:     ObjectifId
  icon:   IconName
  label:  string
  sub:    string
  accent: 'teal' | 'yellow' | 'blue' | 'green'
}> = [
  { id: 'emploi',      icon: 'employment',  label: 'Trouver un emploi ou un stage',     sub: '850 opps actives',                   accent: 'teal'   },
  { id: 'projet',      icon: 'project',     label: 'Lancer mon projet',                  sub: 'Financements & accompagnement',      accent: 'yellow' },
  { id: 'formation',   icon: 'learning',    label: 'Me former',                          sub: 'Bourses & cursus',                   accent: 'blue'   },
  { id: 'agriculture', icon: 'agriculture', label: 'Travailler dans l’agriculture', sub: 'Maraîchage, élevage, transformation', accent: 'green' },
  { id: 'engagement',  icon: 'engagement',  label: 'M’engager dans une cause',      sub: 'Volontariat, civique',               accent: 'teal'   },
]

function tileBackground(accent: 'teal' | 'yellow' | 'blue' | 'green'): string {
  return `var(--gj-${accent}-soft)`
}
function tileColor(accent: 'teal' | 'yellow' | 'blue' | 'green'): string {
  return accent === 'yellow' ? 'var(--gj-yellow-ink)' : `var(--gj-${accent})`
}

/**
 * Onboarding écran 3/5 — Choix d'objectifs (multi-sélection).
 *
 * 5 cards 1-col avec icône colorée + label + checkbox. Bulle Yaye en haut
 * (`YayeAvatar size={32} withBadge`). Persiste dans sessionStorage via
 * `patchDraft`.
 *
 * Note : ces objectifs ne sont PAS persistés en base (la table
 * `ProfilJeune` n'a pas de colonne `objectifs`). Ils servent uniquement à
 * l'écran 5 "Recommendations preview". Un futur sprint ajoutera la colonne.
 */
export function OnboardingObjectifs({ prenom }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<ObjectifId[]>([])

  useEffect(() => {
    setSelected(readDraft().objectifs)
  }, [])

  function toggle(id: ObjectifId) {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      patchDraft({ objectifs: next })
      return next
    })
  }

  function handleNext() {
    patchDraft({ objectifs: selected })
    router.push('/jeune/onboarding/profil')
  }

  function handleSkip() {
    patchDraft({ objectifs: [] })
    router.push('/jeune/onboarding/profil')
  }

  const count = selected.length
  const greeting = prenom ? `Salama ${prenom}` : 'Salama'

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-surface)' }}>
      <StepBar step={2} total={5} />

      <div className="flex-1 flex flex-col gap-space-3 px-space-4 py-space-5 overflow-y-auto">
        {/* Bulle Yaye */}
        <div
          className="flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, var(--gj-teal-soft) 0%, var(--gj-surface) 100%)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 12,
            padding: 14,
          }}
        >
          <YayeAvatar size={32} withBadge />
          <div className="flex-1">
            <div className="text-fs-200 font-black text-gj-teal-deep">{greeting}</div>
            <div className="text-fs-100 text-gj-grey mt-px" style={{ lineHeight: 1.45 }}>
              Je vais te suggérer les meilleures opportunités selon tes objectifs.
            </div>
          </div>
        </div>

        <div>
          <h1 className="font-black text-color-text-primary" style={{ fontSize: 22, lineHeight: 1.2 }}>
            Qu&apos;est-ce que tu cherches&nbsp;?
          </h1>
          <p className="text-fs-100 text-gj-grey mt-1" style={{ lineHeight: 1.5 }}>
            Choisis-en plusieurs. Tu pourras affiner après.
          </p>
        </div>

        <div className="flex flex-col gap-2" role="group" aria-label="Tes objectifs">
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
                  padding: 14,
                  cursor: 'pointer',
                  boxShadow: on ? '0 1px 3px rgba(0,0,0,.04)' : 'none',
                  color: 'inherit',
                }}
              >
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: tileBackground(o.accent),
                    color: tileColor(o.accent),
                  }}
                >
                  <Icon name={o.icon} size={22} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-fs-300 font-black">{o.label}</span>
                  <span className="block text-fs-100 text-gj-grey mt-px">{o.sub}</span>
                </span>
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
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
      </div>

      <FooterCTA
        primary={{
          label: count > 0 ? `Continuer · ${count} sélectionné${count > 1 ? 's' : ''}` : 'Continuer',
          onClick: handleNext,
        }}
        secondary={{ label: 'Passer', onClick: handleSkip }}
      />
    </div>
  )
}
