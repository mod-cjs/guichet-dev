'use client'

import Link from 'next/link'
import Image from 'next/image'

/**
 * OnboardingNavWeb — barre de progression top-bar pour les écrans web
 * de l'onboarding (GUIC-254).
 *
 * Affiche le logo Guichet à gauche, une rangée de points indiquant
 * l'avancement au centre (`step` points sont actifs sur `total + 1`),
 * et un lien "Déjà inscrit ? Se connecter" à droite (masqué via
 * `showLogin={false}` pour l'écran final où l'utilisateur est déjà
 * inscrit).
 *
 * Conforme `design-guichet-v2/web-onboarding.jsx#WebOnboardingNav` —
 * adapté aux tokens `gj-*` et au composant `Image` Next.
 */
export interface OnboardingNavWebProps {
  /** Étape courante (1..total). Aligné sur le stepper mobile — GUIC-444. */
  step: number
  /** Nombre total d'étapes du funnel. Total de dots = `total`. */
  total: number
  /** Affiche "Déjà inscrit ? Se connecter". Défaut true. */
  showLogin?: boolean
}

export function OnboardingNavWeb({ step, total, showLogin = true }: OnboardingNavWebProps) {
  const dotsCount = total
  // `step` est 1-based (objectifs = 1 … recommandations = total). On clamp pour
  // rester dans [1, total] et dériver l'index 0-based du point actif.
  const current    = Math.min(Math.max(step, 1), total)
  const activeIndex = current - 1
  return (
    <header
      className="sticky top-0 bg-gj-surface border-b border-gj-line"
      style={{ zIndex: 'var(--gj-z-nav)' }}
    >
      <div className="flex items-center justify-between gap-space-3 px-space-4 h-16">
        <Link href="/" className="flex items-center gap-2 no-underline flex-shrink-0">
          <Image
            src="/logo-guichet.png"
            alt="Guichet Jeunesse"
            width={120}
            height={30}
            priority
            style={{ height: 30, width: 'auto' }}
          />
        </Link>
        <div
          className="flex items-center gap-2 flex-1 justify-center"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={dotsCount}
          aria-valuenow={current}
          aria-label={`Étape ${current} sur ${dotsCount}`}
        >
          {Array.from({ length: dotsCount }).map((_, i) => {
            const done = i < activeIndex
            const on = i === activeIndex
            return (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  width: on ? 28 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: done
                    ? 'var(--gj-teal-deep)'
                    : on
                      ? 'var(--gj-teal)'
                      : 'var(--gj-line)',
                  transition: 'all .25s ease',
                }}
              />
            )
          })}
        </div>
        {showLogin ? (
          <Link
            href="/auth/connexion"
            className="flex items-center gap-2 no-underline flex-shrink-0"
          >
            <span className="text-fs-200 text-gj-grey hidden sm:inline">Déjà inscrit&nbsp;?</span>
            <span
              className="font-black text-gj-teal-deep"
              style={{
                background: 'var(--gj-surface)',
                border: '1.5px solid var(--gj-line)',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              Se connecter
            </span>
          </Link>
        ) : (
          <span className="flex-shrink-0" style={{ width: 1 }} />
        )}
      </div>
    </header>
  )
}
