'use client'

import { Icon, type IconName } from '@/components/ui/Icon'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { useRecommandationsStep } from '../_logic/use-onboarding-step'
import { regionLabel } from '@/lib/regions'
import { OnboardingNavWeb } from './OnboardingNavWeb'

interface Props {
  prenom?: string
}

interface MockOpp {
  id:       string
  tag:      string
  tagColor: 'red' | 'blue' | 'yellow'
  accent:   'red' | 'blue' | 'yellow' | 'teal' | 'green'
  titre:    string
  sub:      string
  icon:     IconName
  match:    number
  why:      string
}

const RECOS: ReadonlyArray<MockOpp> = [
  {
    id: 'mock-1', tag: 'URGENT · J-3', tagColor: 'red', accent: 'yellow',
    titre: 'Bourse agricole — maraîchage', sub: '600 000 FCFA · Tambacounda',
    icon: 'agriculture', match: 94, why: 'Région · âge · objectif',
  },
  {
    id: 'mock-2', tag: 'STAGE · J-12', tagColor: 'blue', accent: 'teal',
    titre: 'Stage agronomie — Coopérative régionale', sub: '180 000 F/mois · 6 mois',
    icon: 'employment', match: 91, why: 'Région · objectif',
  },
  {
    id: 'mock-3', tag: 'CONCOURS · J-21', tagColor: 'yellow', accent: 'yellow',
    titre: 'Concours Jeunes Entrepreneurs', sub: '2 500 000 FCFA + coaching',
    icon: 'trending', match: 90, why: 'Objectif · âge',
  },
]

function tileBg(accent: MockOpp['accent']): string { return `var(--gj-${accent}-soft)` }
function tileColor(accent: MockOpp['accent']): string {
  return accent === 'yellow' ? 'var(--gj-yellow-ink)' : `var(--gj-${accent})`
}
function tagBg(c: MockOpp['tagColor']): string { return `var(--gj-${c}-soft)` }
function tagColor(c: MockOpp['tagColor']): string {
  return c === 'yellow' ? 'var(--gj-yellow-ink)' : `var(--gj-${c}-ink)`
}

/**
 * Onboarding écran 5/5 — version WEB.
 *
 * Carte centrée 1000px, avatar Yaye 60px + heading personnalisé,
 * grille 3 colonnes de cards opps mockées, footer hint + CTAs.
 * Conforme `design-guichet-v2/web-onboarding.jsx#WebOnboard5Preview`.
 *
 * Réutilise la logique `useRecommandationsStep` (step 3 + clearDraft).
 */
export function OnboardingRecommandationsWeb({ prenom }: Props) {
  const { draft, loading, finalise } = useRecommandationsStep()
  const regionStr = regionLabel(draft.region)
  const headline = prenom
    ? `Voilà 3 opps faites pour toi, ${prenom}.`
    : 'Voilà 3 opps faites pour toi.'

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-bg)' }}>
      <OnboardingNavWeb step={4} total={4} showLogin={false} />
      <div
        className="flex-1 flex flex-col items-center"
        style={{ padding: '40px 24px', overflowY: 'auto' }}
      >
        <div
          className="flex flex-col"
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 18,
            padding: '40px 48px',
            width: 'min(1000px, 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,.04)',
            gap: 22,
          }}
        >
          <div className="flex items-center gap-3">
            <YayeAvatar size={64} withBadge />
            <div>
              <h2 className="font-black" style={{ fontSize: 26, lineHeight: 1.2, letterSpacing: '-.3px' }}>
                {headline}
              </h2>
              <p className="text-gj-grey" style={{ fontSize: 13.5, marginTop: 4 }}>
                Filtré sur <b>247 offres</b> · tes objectifs
                {regionStr ? <> · ta région <b>{regionStr}</b></> : null}
              </p>
            </div>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            {RECOS.map(o => (
              <article
                key={o.id}
                className="flex flex-col gap-2"
                style={{
                  background: 'var(--gj-surface)',
                  border: '1.5px solid var(--gj-line)',
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <span
                  className="self-start font-black uppercase"
                  style={{
                    fontSize: 9.5,
                    background: tagBg(o.tagColor),
                    color: tagColor(o.tagColor),
                    padding: '3px 8px',
                    borderRadius: 999,
                    letterSpacing: '.4px',
                  }}
                >
                  {o.tag}
                </span>
                <div className="flex gap-2 items-center">
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: tileBg(o.accent),
                      color: tileColor(o.accent),
                    }}
                  >
                    <Icon name={o.icon} size={20} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black" style={{ fontSize: 14, lineHeight: 1.3 }}>{o.titre}</div>
                    <div className="text-gj-grey" style={{ fontSize: 11.5, marginTop: 2 }}>{o.sub}</div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-black" style={{ fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: 'var(--gj-green)' }}>{o.match}% match</span>
                    <span className="text-gj-grey">{o.why}</span>
                  </div>
                  <div
                    style={{
                      height: 5, background: 'var(--gj-bg)',
                      borderRadius: 3, overflow: 'hidden',
                    }}
                  >
                    <div style={{ height: '100%', width: `${o.match}%`, background: 'var(--gj-green)' }} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div
            className="flex justify-between items-center"
            style={{ paddingTop: 12, borderTop: '1px solid var(--gj-line)' }}
          >
            <span className="inline-flex items-center gap-2 text-gj-grey" style={{ fontSize: 13 }}>
              <Icon name="info" size={14} style={{ color: 'var(--gj-teal-deep)' }} aria-hidden />
              Tu retrouveras ces 3 opps + 5 autres dans ton espace.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { void finalise('/jeune/opportunites') }}
                className="font-bold"
                disabled={loading}
                style={{
                  background: 'var(--gj-surface)',
                  color: 'var(--gj-teal-deep)',
                  border: '1.5px solid var(--gj-line)',
                  padding: '0 22px',
                  minHeight: 52,
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Voir toutes les opps
              </button>
              <button
                type="button"
                onClick={() => { void finalise('/jeune/tableau-de-bord') }}
                disabled={loading}
                className="inline-flex items-center gap-2 font-black"
                style={{
                  background: 'var(--gj-teal-deep)',
                  color: 'var(--gj-surface)',
                  border: 0,
                  padding: '0 28px',
                  minHeight: 52,
                  borderRadius: 10,
                  fontSize: 15,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Finalisation…' : 'Aller à mon espace'}
                <Icon name="arrow-right" size={14} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
