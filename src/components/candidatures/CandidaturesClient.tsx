'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmptyState, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { CandidatureCard } from './CandidatureCard'
import { CandidaturesFilterChips } from './CandidaturesFilterChips'
import type { CandidatureFilter, CandidatureMock, PipelineStep } from './types'

const STEPS: PipelineStep[] = ['Brouillon', 'Envoyee', 'EnRevue', 'Entretien', 'Decision']

type StatTone = 'teal' | 'blue' | 'yellow' | 'green'

interface StatTile {
  key: string
  label: string
  value: string
  icon: IconName
  tone: StatTone
}

const STAT_TONE_CLASSES: Record<StatTone, string> = {
  teal: 'bg-gj-teal-soft text-gj-teal-deep',
  blue: 'bg-gj-blue-soft text-gj-blue-ink',
  yellow: 'bg-gj-yellow-soft text-gj-yellow-ink',
  green: 'bg-gj-green-soft text-gj-green-ink',
}

/**
 * GUIC-689 (finding F) — bandeau de 4 tuiles statistiques, entièrement
 * dérivées des candidatures déjà chargées (pas de nouvel appel API, pas de
 * changement de loader). Réf design v5 `candidatures-web.jsx:79-90` (desktop)
 * / `candidatures-mobile.jsx:63-76` (mobile), `CAND_STATS`.
 *
 * « Taux de réponse » = part des candidatures envoyées (hors brouillon) ayant
 * eu une réaction du recruteur (au-delà de l'étape "Envoyee" du pipeline) —
 * seule métrique de taux proprement dérivable du contrat `CandidatureMock`
 * actuel (pas de champ dédié). `—` si aucune candidature n'a encore été
 * envoyée (dénominateur nul).
 */
function computeStats(items: CandidatureMock[]): StatTile[] {
  const total = items.length
  const enCours = items.filter((i) => i.currentStep !== 'Decision').length
  const entretiens = items.filter((i) => i.currentStep === 'Entretien').length
  const envoyees = items.filter((i) => i.currentStep !== 'Brouillon')
  const repondues = envoyees.filter((i) => i.currentStep !== 'Envoyee')
  const tauxReponse =
    envoyees.length > 0 ? `${Math.round((repondues.length / envoyees.length) * 100)}%` : '—'

  return [
    { key: 'total', label: 'Candidatures', value: String(total), icon: 'document', tone: 'teal' },
    { key: 'en-cours', label: 'En cours', value: String(enCours), icon: 'clock', tone: 'blue' },
    { key: 'entretiens', label: 'Entretiens', value: String(entretiens), icon: 'calendar', tone: 'yellow' },
    { key: 'taux-reponse', label: 'Taux de réponse', value: tauxReponse, icon: 'trending', tone: 'green' },
  ]
}

export interface CandidaturesClientProps {
  items: CandidatureMock[]
}

function computeCounts(items: CandidatureMock[]): Record<CandidatureFilter, number> {
  const base: Record<CandidatureFilter, number> = {
    all: items.length,
    Brouillon: 0,
    Envoyee: 0,
    EnRevue: 0,
    Entretien: 0,
    Decision: 0,
  }
  for (const item of items) base[item.currentStep] += 1
  return base
}

/**
 * Pipeline candidatures côté client (GUIC-190).
 *
 * Gère :
 * - état de filtre (chips)
 * - compteur en header
 * - liste filtrée OR empty state
 */
export function CandidaturesClient({ items }: CandidaturesClientProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<CandidatureFilter>('all')

  const counts = useMemo(() => computeCounts(items), [items])
  const stats = useMemo(() => computeStats(items), [items])

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.currentStep === filter)),
    [items, filter],
  )

  return (
    <div className="flex flex-col gap-space-3">
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-space-2"
        role="group"
        aria-label="Statistiques de mes candidatures"
        data-testid="candidatures-stats"
      >
        {stats.map((s) => (
          <div
            key={s.key}
            className="rounded-gj-md border border-gj-line bg-gj-surface p-space-3"
            data-testid={`candidatures-stat-${s.key}`}
          >
            <span
              className={[
                'inline-flex items-center justify-center w-9 h-9 rounded-gj-md',
                STAT_TONE_CLASSES[s.tone],
              ].join(' ')}
            >
              <Icon name={s.icon} size={18} />
            </span>
            <p className="mt-space-2 text-fs-600 font-black text-color-text-primary leading-none">
              {s.value}
            </p>
            <p className="mt-[2px] text-fs-100 font-bold text-color-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <p
        className="text-fs-200 font-bold uppercase tracking-[0.04em] text-color-text-muted"
        data-testid="candidatures-counter"
      >
        {items.length} dossier{items.length > 1 ? 's' : ''}
      </p>

      <CandidaturesFilterChips active={filter} counts={counts} onChange={setFilter} />

      {filtered.length === 0 ? (
        filter === 'all' ? (
          <EmptyState
            title="Pas encore de candidature"
            description="Explorez les opportunités et postulez à celles qui vous correspondent."
            actionLabel="Voir les opportunités"
            onAction={() => router.push('/opportunites')}
          />
        ) : (
          <div
            className="rounded-gj-md border border-gj-line bg-gj-surface p-space-4 text-fs-300 text-color-text-secondary"
            data-testid="candidatures-empty-filter"
          >
            Aucune candidature à cette étape pour l'instant.{' '}
            <button
              type="button"
              className="font-bold text-gj-teal-deep underline"
              onClick={() => setFilter('all')}
            >
              Voir toutes
            </button>
          </div>
        )
      ) : (
        <ul
          className="grid grid-cols-1 lg:grid-cols-2 gap-space-3"
          data-testid="candidatures-list"
          aria-label="Liste des candidatures"
        >
          {filtered.map((item) => (
            <li key={item.id}>
              <CandidatureCard item={item} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-fs-100 text-color-text-muted text-center mt-space-2">
        Besoin d'aide ?{' '}
        <Link href="/jeune/tableau-de-bord" className="font-bold text-gj-teal-deep underline">
          Retour au tableau de bord
        </Link>
      </p>

      <span className="sr-only" data-testid="pipeline-steps-count">
        {STEPS.length}
      </span>
    </div>
  )
}
