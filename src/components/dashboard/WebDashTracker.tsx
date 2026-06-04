import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'

export type TrackerStage =
  | 'depot'
  | 'review_cjs'
  | 'entretien'
  | 'decision'
  | 'finalise'

export interface TrackerItem {
  id:        string
  title:     string
  subtitle:  string
  icon:      IconName
  tone:      'red' | 'teal' | 'green' | 'yellow'
  /** Étape actuelle (1..5) */
  currentStep: number
  totalSteps?: number
  stepLabel:   string
  cta?:        { label: string; href: string; variant?: 'primary' | 'ghost' }
  highlight?:  string
}

interface Props {
  items: TrackerItem[]
}

const iconBgTone: Record<TrackerItem['tone'], string> = {
  red:    'bg-gj-red-soft text-gj-red',
  teal:   'bg-gj-teal-soft text-gj-teal-deep',
  green:  'bg-gj-green-soft text-gj-green-ink',
  yellow: 'bg-gj-yellow-soft text-gj-yellow-ink',
}

/**
 * WebDashTracker — liste des candidatures en cours avec barème de progression
 * (5 étapes : dépôt → review CJS → entretien → décision → finalisé).
 *
 * Référence : design-guichet-v2/web-dashboard.jsx#WebDashTracker (L.461-518)
 */
export function WebDashTracker({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-gj-surface border border-gj-line rounded-gj-md p-space-5
        text-center text-color-text-secondary text-fs-300">
        Aucune candidature en cours pour l&apos;instant.
      </div>
    )
  }
  return (
    <div className="bg-gj-surface border border-gj-line rounded-gj-md overflow-hidden">
      {items.map((it, i) => {
        const total = it.totalSteps ?? 5
        const progressId = `tracker-progress-${it.id}`
        return (
          <div
            key={it.id}
            className={`grid grid-cols-[44px_1fr_auto] gap-space-3 items-center
              p-space-4 ${i < items.length - 1 ? 'border-b border-gj-line' : ''}`}
          >
            <span
              className={`w-11 h-11 rounded-gj-md inline-flex items-center
                justify-center ${iconBgTone[it.tone]}`}
              aria-hidden
            >
              <Icon name={it.icon} size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-fs-300 font-black leading-tight">{it.title}</div>
              <div className="text-fs-200 text-color-text-secondary mt-space-1">
                {it.subtitle}
              </div>
              <div
                role="progressbar"
                aria-valuenow={it.currentStep}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-labelledby={progressId}
                className="flex gap-space-2 mt-space-2 items-center"
              >
                {Array.from({ length: total }).map((_, idx) => {
                  const done    = idx < it.currentStep
                  const current = idx === it.currentStep
                  return (
                    <span
                      key={idx}
                      aria-hidden
                      className={`w-2 h-2 rounded-full ${
                        done
                          ? 'bg-gj-green'
                          : current
                            ? 'bg-gj-yellow ring-4 ring-gj-yellow-soft'
                            : 'bg-gj-line-strong'
                      }`}
                    />
                  )
                })}
              </div>
              <div id={progressId} className="text-fs-100 text-color-text-secondary mt-space-1">
                Étape {it.currentStep + 1}/{total} —{' '}
                <b className={it.highlight ? 'text-gj-green-ink' : 'text-color-text-primary'}>
                  {it.stepLabel}
                </b>
              </div>
              {it.highlight && (
                <div className="text-fs-100 font-black text-gj-green-ink mt-space-1">
                  {it.highlight}
                </div>
              )}
            </div>
            {it.cta && (
              <Link
                href={it.cta.href}
                className={`px-space-3 py-space-2 rounded-gj-md font-black text-fs-200
                  ${
                    it.cta.variant === 'ghost'
                      ? 'bg-gj-surface border border-gj-line text-gj-teal-deep hover:bg-gj-teal-soft'
                      : 'bg-gj-teal-deep text-white hover:bg-gj-teal-deep-2'
                  } transition-colors whitespace-nowrap`}
              >
                {it.cta.label}
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
