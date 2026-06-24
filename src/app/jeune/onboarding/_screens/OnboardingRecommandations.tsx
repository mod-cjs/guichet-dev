'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/Icon'
import { StepBar } from '@/components/ui/StepBar'
import { FooterCTA } from '@/components/ui/FooterCTA'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { clearDraft, readDraft, type OnboardingDraft } from '@/lib/onboarding-draft'
import { regionLabel } from '@/lib/regions'

interface Props {
  prenom?: string
}

/** Mapping objectif → label affichable (sub texte recommandations). */
const OBJECTIF_LABELS: Record<string, string> = {
  emploi:      'Emploi',
  projet:      'Création de projet',
  formation:   'Formation',
  agriculture: 'Agriculture',
  engagement:  'Engagement citoyen',
  bourse:      'Bourse',
}

interface MockOpportunite {
  id:       string
  tag:      string
  tagColor: 'red' | 'blue' | 'yellow'
  accent:   'red' | 'blue' | 'yellow' | 'teal' | 'green'
  titre:    string
  organisation: string
  icon:     IconName
  match:    number
  meta:     string[]
  raison:   string
}

/**
 * 3 opportunités mockées (hardcodées) — preview pour finaliser l'onboarding.
 *
 * Match% : entre 75 et 95 (cf brief Q4 : score mocké côté front, pas de moteur réel).
 */
const RECOS: ReadonlyArray<MockOpportunite> = [
  {
    id: 'mock-1',
    tag: 'Urgent · J-3',
    tagColor: 'red',
    accent: 'red',
    titre: 'Bourse agricole — Micro-initiative maraîchère',
    organisation: 'Programme YEAH',
    icon: 'agriculture',
    match: 94,
    meta: ['jusqu’à 600 000 F', 'Tambacounda'],
    raison: 'Région · âge · objectif',
  },
  {
    id: 'mock-2',
    tag: 'Stage',
    tagColor: 'blue',
    accent: 'blue',
    titre: 'Stage agronomie — Coopérative régionale',
    organisation: 'Coopérative Sénégal-Vert',
    icon: 'employment',
    match: 91,
    meta: ['180 000 F/mois', '6 mois · J-12'],
    raison: 'Région · objectif',
  },
  {
    id: 'mock-3',
    tag: 'Concours',
    tagColor: 'yellow',
    accent: 'yellow',
    titre: 'Yaakaar Innovation — Startup Award',
    organisation: 'Programme Yaakaar',
    icon: 'trending',
    match: 86,
    meta: ['Prix 2 000 000 F', 'National · J-21'],
    raison: 'Objectif · niveau',
  },
]

/**
 * Mapping objectif → domaine (`Domaine` enum Prisma — voir schema).
 * Permet de persister des `domainesInteret` cohérents dès la finalisation
 * de l'onboarding court, plutôt qu'un tableau vide.
 */
function mapObjectifToDomaine(o: string): string | null {
  switch (o) {
    case 'agriculture': return 'Agriculture'
    case 'formation':   return 'Education'
    case 'engagement':  return 'Citoyennete'
    case 'projet':      return 'Entrepreneuriat'
    case 'emploi':      return null // pas de domaine spécifique
    default:            return null
  }
}

function tileBg(accent: MockOpportunite['accent']): string {
  return `var(--gj-${accent}-soft)`
}
function tileColor(accent: MockOpportunite['accent']): string {
  return accent === 'yellow' ? 'var(--gj-yellow-ink)' : `var(--gj-${accent})`
}
function tagBg(c: 'red' | 'blue' | 'yellow'): string {
  return `var(--gj-${c}-soft)`
}
function tagColor(c: 'red' | 'blue' | 'yellow'): string {
  return c === 'yellow' ? 'var(--gj-yellow-ink)' : `var(--gj-${c}-ink)`
}

/**
 * Onboarding écran 5/5 — Recommandations preview.
 *
 * Bulle Yaye en haut (gradient teal-deep → ink-teal), 3 cards d'opps
 * mockées avec tag + organisation + match% + raisons. Finalise
 * l'onboarding au CTA primaire en appelant step 3 de
 * `/api/v1/onboarding`.
 */
export function OnboardingRecommandations({ prenom }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<OnboardingDraft>({ objectifs: [] })

  useEffect(() => {
    let alive = true
    readDraft().then(d => { if (alive) setDraft(d) })
    return () => { alive = false }
  }, [])

  const regionStr = regionLabel(draft.region)

  async function finaliser(redirectTo: string) {
    setLoading(true)
    try {
      // Step 3 : finalisation onboarding. On envoie les domaines d'intérêt
      // déduits des objectifs choisis (mapping 1-1 : `agriculture` →
      // domaine "Agriculture", etc.) — voir GUIC-181 commit body.
      const domainesInteret = draft.objectifs
        .map(mapObjectifToDomaine)
        .filter((v): v is string => v !== null)

      const r = await fetch('/api/v1/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 3, data: { domainesInteret } }),
      })
      if (!r.ok) {
        setLoading(false)
        return
      }
      await clearDraft()
      router.push(redirectTo)
    } catch {
      setLoading(false)
    }
  }

  const headline = prenom
    ? `Top ${prenom} — voilà ce que j’ai trouvé pour toi${regionStr ? ' à ' + regionStr : ''}.`
    : `Voilà ce que j’ai trouvé pour toi${regionStr ? ' à ' + regionStr : ''}.`

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-bg)' }}>
      <StepBar step={4} total={4} label="Étape 4 / 4" />

      <div className="flex-1 flex flex-col gap-space-3 px-space-4 py-space-4 overflow-y-auto">
        {/* Bulle Yaye gradient */}
        <div
          className="relative overflow-hidden text-white"
          style={{
            background: 'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div className="flex items-center gap-3">
            <YayeAvatar size={48} withBadge />
            <div className="flex-1">
              <div className="text-fs-300 font-black">{headline}</div>
              <div className="text-fs-100" style={{ opacity: 0.8, marginTop: 2 }}>
                Basé sur tes objectifs · {draft.objectifs.length > 0
                  ? draft.objectifs.map(o => OBJECTIF_LABELS[o] ?? o).join(' · ')
                  : 'profil minimal'}
              </div>
            </div>
          </div>
        </div>

        {/* 3 cards opps mockées */}
        {RECOS.map(o => (
          <article
            key={o.id}
            className="relative overflow-hidden flex flex-col gap-3"
            style={{
              background: 'var(--gj-surface)',
              border: '1.5px solid var(--gj-line)',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <span
              className="absolute font-black uppercase"
              style={{
                top: 12, right: 12,
                background: tagBg(o.tagColor),
                color: tagColor(o.tagColor),
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 999,
                letterSpacing: '.4px',
              }}
            >
              {o.tag}
            </span>
            <div className="flex gap-3 items-start">
              <span
                aria-hidden
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: tileBg(o.accent),
                  color: tileColor(o.accent),
                }}
              >
                <Icon name={o.icon} size={22} />
              </span>
              <div className="flex-1 min-w-0" style={{ paddingRight: 70 }}>
                <div className="text-fs-300 font-black" style={{ lineHeight: 1.3 }}>{o.titre}</div>
                <div className="text-fs-100 text-gj-grey mt-px">{o.organisation}</div>
                <div className="flex flex-wrap gap-2 text-fs-100 text-gj-grey mt-1">
                  {o.meta.map(m => <span key={m}>{m}</span>)}
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-fs-100 font-black">
                <span style={{ color: 'var(--gj-green)' }}>{o.match}% match</span>
                <span className="text-gj-grey">{o.raison}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--gj-bg)', overflow: 'hidden', marginTop: 6 }}>
                <div style={{ height: '100%', width: `${o.match}%`, background: 'var(--gj-green)', borderRadius: 2 }} />
              </div>
            </div>
          </article>
        ))}
      </div>

      <FooterCTA
        primary={{ label: 'Aller au tableau de bord', onClick: () => finaliser('/jeune/tableau-de-bord') }}
        secondary={{ label: '← Retour au profil', onClick: () => { window.history.back() } }}
        loading={loading}
      />
    </div>
  )
}
