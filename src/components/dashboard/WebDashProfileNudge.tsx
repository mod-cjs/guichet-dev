import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

interface Props {
  completionScore: number
  href?:           string
}

/**
 * WebDashProfileNudge — CTA aside encourageant à compléter le profil
 * pour débloquer plus d'opportunités pertinentes.
 *
 * Référence : design-guichet-v2/web-dashboard.jsx#WebDashProfileNudge (L.585-609)
 */
export function WebDashProfileNudge({ completionScore, href = '/jeune/mon-profil' }: Props) {
  const score = Math.max(0, Math.min(100, completionScore))
  const remaining = 100 - score
  const message =
    score >= 80
      ? 'Profil presque parfait'
      : score >= 50
        ? 'Profil presque complet'
        : 'Profil à enrichir'
  const lede =
    score >= 80
      ? 'Quelques finitions pour des recommandations imbattables.'
      : `Ajoute ton CV pour débloquer ${Math.max(2, Math.round(remaining / 10))}× plus d'opps pertinentes.`

  return (
    <aside
      className="rounded-gj-md p-space-4 border border-gj-yellow
        bg-gradient-to-br from-gj-yellow-soft to-gj-surface
        flex flex-col gap-space-3"
      aria-label="Compléter mon profil"
    >
      <div className="flex items-center gap-space-3">
        <div className="text-fs-700 font-black text-gj-yellow-ink leading-none">
          {score}%
        </div>
        <div>
          <div className="text-fs-300 font-black text-color-text-primary">
            {message}
          </div>
          <div className="text-fs-200 text-color-text-secondary mt-space-1 leading-relaxed">
            {lede}
          </div>
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Complétude du profil"
        className="h-2 bg-gj-surface rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-gj-yellow transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <Link
        href={href}
        className="inline-flex items-center justify-center gap-space-2
          bg-gj-yellow text-gj-ink-teal px-space-3 py-space-3 rounded-gj-md
          font-black text-fs-200 hover:bg-gj-yellow-deep transition-colors"
      >
        Compléter mon profil <Icon name="arrow-right" size={12} />
      </Link>
    </aside>
  )
}
