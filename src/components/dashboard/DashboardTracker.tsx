import Link from 'next/link'
import { Button, Icon } from '@/components/ui'

export interface DashboardTrackerProps {
  /** Score de complétude du profil (0–100). */
  score:     number
  /** Lien CTA (ex. "/jeune/mon-profil"). */
  href?:     string
  /** Label CTA personnalisable. */
  ctaLabel?: string
  /** Sous-titre custom. Si absent, message dérivé du score. */
  message?:  string
}

function defaultMessage(score: number): string {
  if (score >= 90) return 'Ton profil est complet. Continue d\'enrichir tes expériences.'
  if (score >= 70) return 'Ajoute ton CV pour débloquer 3× plus d\'opportunités pertinentes.'
  if (score >= 40) return 'Encore quelques infos pour faire matcher Yaye avec les bonnes offres.'
  return 'Complète ton profil pour accéder aux opportunités adaptées à ton parcours.'
}

/**
 * Tracker de complétude du profil — barre de progression jaune + CTA.
 * Visuellement dérivé de `WebDashProfileNudge` du design v2.
 */
export function DashboardTracker({
  score,
  href     = '/jeune/mon-profil',
  ctaLabel = 'Compléter mon profil',
  message,
}: DashboardTrackerProps) {
  const safeScore = Math.min(100, Math.max(0, Math.round(score)))
  const text = message ?? defaultMessage(safeScore)

  return (
    <section
      className="rounded-gj-lg p-space-4 border-[1.5px] border-gj-yellow flex flex-col gap-space-3"
      style={{ backgroundImage: 'linear-gradient(135deg, var(--gj-yellow-soft), var(--gj-surface))' }}
      aria-label="Complétude du profil"
    >
      <div className="flex items-center gap-space-3">
        <div
          className="text-fs-700 font-black leading-none text-gj-yellow-ink"
          aria-hidden
        >
          {safeScore}%
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-fs-300 font-black text-gj-ink">Profil {safeScore}% complété</div>
          <p className="text-fs-200 text-gj-grey leading-snug mt-1">{text}</p>
        </div>
      </div>

      <div
        className="h-[6px] bg-white rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={safeScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression complétude profil"
      >
        <div
          className="h-full bg-gj-yellow transition-[width] duration-500"
          style={{ width: `${safeScore}%` }}
        />
      </div>

      <Link href={href} className="self-start">
        <Button variant="primary" size="sm" className="!bg-gj-yellow !text-gj-ink hover:!bg-gj-yellow-deep">
          <span className="inline-flex items-center gap-space-2">
            {ctaLabel}
            <Icon name="arrow-right" size={14} />
          </span>
        </Button>
      </Link>
    </section>
  )
}
