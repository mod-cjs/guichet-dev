import Link from 'next/link'
import { Button } from '@/components/ui'

interface Props {
  prenom:           string
  nom:              string
  completionScore:  number
}

function message(score: number): string {
  if (score >= 80) return 'Votre profil est presque parfait. Continuez comme ça.'
  if (score >= 50) return 'Belle progression. Encore quelques infos pour débloquer toutes les opportunités.'
  return 'Complétez votre profil pour accéder aux offres adaptées à votre parcours.'
}

function ringStroke(score: number): string {
  if (score >= 80) return 'var(--gj-surface)'
  if (score >= 50) return '#F9C400'
  return '#FFB4A6'
}

function ctaLabel(score: number): string {
  if (score >= 80) return 'Voir mon profil'
  return 'Compléter mon profil'
}

export function DashboardHero({ prenom, nom, completionScore }: Props) {
  const initials = (prenom?.[0] ?? '').toUpperCase() + (nom?.[0] ?? '').toUpperCase()
  const safeScore = Math.min(100, Math.max(0, completionScore))
  // Cercle SVG : circumference = 2πr avec r=42 → ~263.9
  const C = 263.9
  const offset = C - (C * safeScore) / 100

  return (
    <div
      className="relative overflow-hidden rounded-gj-lg p-space-5 md:p-space-6
        bg-gradient-to-br from-gj-teal-deep via-gj-teal to-gj-yellow text-white"
    >
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-gj-yellow/30 blur-2xl" aria-hidden />

      <div className="relative flex items-center gap-space-5 flex-wrap">
        {/* Anneau de progression + initiales */}
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" strokeWidth="6" className="stroke-white/25" fill="none" />
            <circle
              cx="50" cy="50" r="42" strokeWidth="6" fill="none"
              className="transition-all duration-500"
              style={{
                strokeDasharray:  C,
                strokeDashoffset: offset,
                stroke:           ringStroke(safeScore),
                transform:        'rotate(-90deg)',
                transformOrigin:  '50% 50%',
                strokeLinecap:    'round',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-fs-500 font-black">{initials || '·'}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-fs-200 uppercase tracking-wider opacity-80">Bonjour</p>
          <h1 className="text-fs-600 md:text-fs-700 font-black leading-tight mt-1">{prenom}</h1>
          <p className="text-fs-300 opacity-95 mt-space-2 max-w-md">{message(safeScore)}</p>
        </div>

        <div className="flex flex-col items-end gap-space-2 flex-shrink-0">
          <span className="text-fs-600 md:text-fs-700 font-black leading-none">{safeScore}%</span>
          <span className="text-fs-200 opacity-80">complétude</span>
          <Link href="/jeune/mon-profil">
            <Button variant="primary" size="sm" className="!bg-white !text-gj-teal-deep hover:!bg-white/90">
              {ctaLabel(safeScore)}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
