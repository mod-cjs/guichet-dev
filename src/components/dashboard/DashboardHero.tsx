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

function ringColor(score: number): string {
  if (score >= 80) return 'stroke-gj-teal'
  if (score >= 50) return 'stroke-gj-yellow'
  return 'stroke-gj-red'
}

export function DashboardHero({ prenom, nom, completionScore }: Props) {
  const initials = (prenom?.[0] ?? '').toUpperCase() + (nom?.[0] ?? '').toUpperCase()
  // Cercle : circumference = 2πr avec r=42 → ~263.9
  const C = 263.9
  const offset = C - (C * Math.min(100, Math.max(0, completionScore))) / 100

  return (
    <div
      className="relative overflow-hidden rounded-gj-lg p-space-5 md:p-space-6
        bg-gradient-to-br from-gj-teal-deep via-gj-teal to-gj-yellow text-white"
    >
      {/* Décoration : cercle yellow flou */}
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-gj-yellow/30 blur-2xl" aria-hidden />

      <div className="relative flex items-center gap-space-5 flex-wrap">
        {/* Anneau de progression + initiales */}
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" strokeWidth="6" className="stroke-white/25" fill="none" />
            <circle
              cx="50" cy="50" r="42" strokeWidth="6" fill="none"
              className={`${ringColor(completionScore)} transition-all duration-500`}
              style={{
                strokeDasharray:  C,
                strokeDashoffset: offset,
                stroke: completionScore >= 80 ? '#FFFFFF' : completionScore >= 50 ? '#F9C400' : '#FFB4A6',
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                strokeLinecap: 'round',
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
          <p className="text-fs-300 opacity-95 mt-space-2 max-w-md">{message(completionScore)}</p>
        </div>

        <div className="flex flex-col items-end gap-space-2 flex-shrink-0">
          <span className="text-fs-600 md:text-fs-700 font-black leading-none">{completionScore}%</span>
          <span className="text-fs-200 opacity-80">complétude</span>
          {completionScore < 80 && (
            <Link href="/jeune/mon-profil">
              <Button variant="primary" size="sm" className="!bg-white !text-gj-teal-deep hover:!bg-white/90">
                Compléter
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
