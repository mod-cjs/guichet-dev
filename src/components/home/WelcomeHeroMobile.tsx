'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import {
  FALLBACK_HOME_STATS,
  formatHomeStat,
  type HomeStats,
} from '@/lib/loaders/home-stats'

interface Props {
  /** Prénom affiché en eyebrow s'il est connu (sinon "Le guichet unique du CJS"). */
  prenom?: string
  /**
   * Stats CJS injectées par le Server Component parent (GUIC-235).
   * Fallback sur le snapshot 2026-05 pour Storybook / contexts sans DB.
   */
  stats?: HomeStats
}

/**
 * Onboarding écran 1/5 — Welcome.
 *
 * Hero gradient `gj-teal-deep → ink-teal`, glow jaune en haut à droite,
 * stats CJS hardcodées, photo testimonial placeholder, CTA primaire jaune
 * "Commencer" → `/jeune/onboarding/telephone`, CTA ghost "J'ai déjà un compte"
 * → `/auth/connexion`.
 *
 * Conforme `design-guichet-v2/onboarding.jsx#Onboard1Welcome`.
 */
export function OnboardingWelcome({ prenom, stats = FALLBACK_HOME_STATS }: Props) {
  const STATS = [
    { value: formatHomeStat(stats.jeunesInscrits),      label: 'Jeunes inscrits' },
    { value: formatHomeStat(stats.opportunitesActives), label: 'Opps actives'    },
    { value: formatHomeStat(stats.regionsCouvertes),    label: 'Régions'         },
  ] as const
  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: 'calc(100dvh - 3rem)',
        background: 'var(--gj-ink-teal)',
        color: '#fff',
      }}
    >
      {/* Hero */}
      <section
        className="relative flex-1 flex flex-col px-space-5 pt-space-5 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)',
        }}
      >
        {/* glow jaune */}
        <span
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: -120,
            right: -100,
            width: 340,
            height: 340,
            background: 'radial-gradient(circle, rgba(249,196,0,.28) 0%, transparent 60%)',
          }}
        />
        <span
          className="relative inline-flex items-center gap-1 self-start text-fs-100 font-black uppercase"
          style={{
            background: 'rgba(249,196,0,.22)',
            color: 'var(--gj-yellow)',
            padding: '5px 10px',
            borderRadius: 999,
            letterSpacing: '.5px',
            marginTop: 24,
          }}
        >
          {prenom ? `Bienvenue ${prenom}` : 'Le guichet unique du CJS'}
        </span>
        <h1
          className="relative font-black"
          style={{ fontSize: 32, lineHeight: 1.1, marginTop: 24 }}
        >
          Trouve ta prochaine opportunité.
        </h1>
        <p
          className="relative text-fs-300"
          style={{ marginTop: 14, opacity: 0.85, lineHeight: 1.5 }}
        >
          Emploi · stage · bourse · projet. Pour les 16–35 ans, partout au Sénégal.
        </p>

        {/* photo testimonial placeholder */}
        <div
          className="relative overflow-hidden"
          style={{
            margin: '32px -22px 0',
            height: 220,
            background: 'linear-gradient(135deg, #C49A5A, #7A5C3A)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(0,40,32,0) 0%, rgba(10,40,32,.7) 100%)' }}
          />
          <div
            className="absolute flex items-center gap-1 text-fs-100 font-bold"
            style={{ left: 22, right: 22, bottom: 18, color: '#fff' }}
          >
            <Icon name="sparkle" size={14} style={{ color: 'var(--gj-yellow)' }} aria-hidden />
            <span>« Grâce au Guichet, j&apos;ai trouvé mon stage en 3 semaines. » — Aïssatou, 23 ans, Thiès</span>
          </div>
        </div>

        {/* Stats */}
        <div
          className="relative flex justify-around py-space-3"
          style={{ borderTop: '1px solid rgba(255,255,255,.12)' }}
        >
          {STATS.map(s => (
            <div key={s.label} className="flex flex-col items-center gap-px">
              <span className="font-black" style={{ fontSize: 22, color: 'var(--gj-yellow)' }}>{s.value}</span>
              <span
                className="text-[10px] uppercase font-bold"
                style={{ opacity: 0.8, letterSpacing: '.4px' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA wrap (sticky bottom, ink-teal) */}
      <div
        className="flex-shrink-0 px-space-5"
        style={{
          background: 'var(--gj-ink-teal)',
          padding: '18px 22px 22px',
          paddingBottom: 'calc(22px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Link
          href="/jeune/onboarding/telephone"
          className="inline-flex items-center justify-center gap-2 w-full font-black no-underline"
          style={{
            background: 'var(--gj-yellow)',
            color: 'var(--gj-ink)',
            border: 0,
            fontSize: 16,
            minHeight: 54,
            borderRadius: 12,
            padding: '0 18px',
          }}
        >
          <span>Commencer</span>
          <Icon name="arrow-right" size={16} aria-hidden />
        </Link>
        <Link
          href="/auth/connexion"
          className="inline-flex items-center justify-center w-full font-bold no-underline mt-space-2"
          style={{
            background: 'transparent',
            color: '#fff',
            border: '1.5px solid rgba(255,255,255,.4)',
            fontSize: 14,
            minHeight: 48,
            borderRadius: 12,
            padding: '0 18px',
          }}
        >
          J&apos;ai déjà un compte
        </Link>
      </div>
    </div>
  )
}
