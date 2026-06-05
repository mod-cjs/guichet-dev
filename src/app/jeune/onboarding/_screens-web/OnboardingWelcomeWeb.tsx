'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'

interface Props {
  prenom?: string
}

const STATS = [
  { value: '22 695', label: 'Jeunes inscrits' },
  { value: '1 240',  label: 'Opps actives'    },
  { value: '14',     label: 'Régions'         },
  { value: '9',      label: 'Centres CJS'     },
] as const

/**
 * Onboarding écran 1/5 — version WEB (≥1024px, GUIC-195 phase 3-1).
 *
 * Layout split : colonne gauche headline + stats + CTAs, colonne droite
 * photo card + opp card stack + testimonial Yaye. Conforme
 * `design-guichet-v2/web-onboarding.jsx#WebOnboard1Landing`.
 *
 * Pas de logique métier : 2 liens vers `/jeune/onboarding/telephone`
 * et `/auth/connexion`.
 */
export function OnboardingWelcomeWeb({ prenom }: Props) {
  return (
    <div
      className="flex flex-col text-white"
      style={{
        minHeight: 'calc(100dvh - 3rem)',
        background: 'linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          right: -100, top: -120, width: 540, height: 540,
          background: 'radial-gradient(circle, rgba(249,196,0,.22) 0%, transparent 60%)',
        }}
      />
      <section
        className="relative flex-1 grid items-center"
        style={{
          gridTemplateColumns: '1.1fr 1fr',
          gap: 40,
          padding: '60px 64px',
        }}
      >
        {/* Colonne gauche */}
        <div className="flex flex-col">
          <span
            className="inline-flex items-center gap-2 self-start font-black uppercase"
            style={{
              fontSize: 11,
              background: 'rgba(249,196,0,.22)',
              color: 'var(--gj-yellow)',
              padding: '6px 12px',
              borderRadius: 999,
              letterSpacing: '.5px',
            }}
          >
            <Icon name="sparkle" size={12} aria-hidden />
            {prenom ? `Bienvenue ${prenom}` : 'Le guichet unique du CJS'}
          </span>
          <h1
            className="font-black"
            style={{ fontSize: 56, lineHeight: 1.05, marginTop: 22, letterSpacing: '-1.2px' }}
          >
            Ton avenir,<br />commence ici.
          </h1>
          <p className="text-fs-400" style={{ lineHeight: 1.55, marginTop: 18, opacity: 0.9, maxWidth: 540 }}>
            Emploi · stage · bourse · projet · formation. Toutes les opportunités pour les
            {' '}<b>16–35 ans au Sénégal</b>, en un seul endroit. Yaye t&apos;accompagne — en français ou en Wolof.
          </p>

          <div className="flex gap-3" style={{ marginTop: 32 }}>
            <Link
              href="/jeune/onboarding/telephone"
              className="inline-flex items-center gap-2 font-black no-underline"
              style={{
                background: 'var(--gj-yellow)',
                color: 'var(--gj-ink)',
                fontSize: 15,
                padding: '0 24px',
                minHeight: 56,
                borderRadius: 12,
              }}
            >
              Créer mon compte gratuit
              <Icon name="arrow-right" size={16} aria-hidden />
            </Link>
            <Link
              href="/auth/connexion"
              className="inline-flex items-center font-bold no-underline"
              style={{
                background: 'rgba(255,255,255,.08)',
                color: '#fff',
                border: '1.5px solid rgba(255,255,255,.3)',
                fontSize: 14,
                padding: '0 24px',
                minHeight: 56,
                borderRadius: 12,
              }}
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          <div
            className="flex"
            style={{
              gap: 32,
              marginTop: 40,
              borderTop: '1px solid rgba(255,255,255,.18)',
              paddingTop: 24,
            }}
          >
            {STATS.map(s => (
              <div key={s.label} className="flex flex-col gap-[2px]">
                <span className="font-black" style={{ fontSize: 28, color: 'var(--gj-yellow)' }}>
                  {s.value}
                </span>
                <span
                  className="uppercase"
                  style={{ fontSize: 11, opacity: 0.8, letterSpacing: '.4px' }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne droite — stack visuel */}
        <div className="flex flex-col gap-3 relative">
          <div
            role="img"
            aria-label="Témoignage Aïssatou, 23 ans, Thiès"
            style={{
              height: 220,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #C49A5A 0%, #7A5C3A 100%)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,.35)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(10,40,32,.7) 100%)' }}
            />
            <div
              className="absolute"
              style={{ left: 22, bottom: 18, right: 22, color: '#fff', fontSize: 13, fontWeight: 700 }}
            >
              <div
                className="font-black uppercase"
                style={{
                  fontSize: 11,
                  color: 'var(--gj-yellow)',
                  letterSpacing: '.4px',
                  marginBottom: 4,
                }}
              >
                Aïssatou · 23 ans · Thiès
              </div>
              « Grâce au Guichet, j&apos;ai trouvé mon stage en agronomie en 3 semaines. »
            </div>
          </div>

          <div
            className="flex flex-col gap-2"
            style={{
              background: 'var(--gj-surface)',
              borderRadius: 14,
              padding: 18,
              color: 'var(--gj-ink)',
              boxShadow: '0 20px 50px rgba(0,0,0,.25)',
              transform: 'translate(-30px, -40px)',
              width: 320,
            }}
          >
            <span
              className="self-start font-black uppercase"
              style={{
                fontSize: 9.5,
                background: 'var(--gj-red-soft)',
                color: 'var(--gj-red-ink)',
                padding: '3px 8px',
                borderRadius: 999,
                letterSpacing: '.4px',
              }}
            >
              URGENT · J-3
            </span>
            <div className="flex gap-2 items-center">
              <span
                aria-hidden
                className="inline-flex items-center justify-center"
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--gj-yellow-soft)',
                  color: 'var(--gj-yellow-ink)',
                }}
              >
                <Icon name="agriculture" size={20} />
              </span>
              <div>
                <div className="font-black" style={{ fontSize: 13.5 }}>Bourse agricole — maraîchage</div>
                <div className="text-gj-grey" style={{ fontSize: 11, marginTop: 1 }}>
                  600 000 FCFA · Tambacounda
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-1 font-black"
              style={{ fontSize: 11, color: 'var(--gj-green)' }}
            >
              <Icon name="sparkle" size={12} aria-hidden />
              94% match avec ton profil
            </div>
          </div>

          <div
            className="flex gap-3 items-center"
            style={{
              background: 'rgba(255,255,255,.08)',
              border: '1.5px solid rgba(255,255,255,.18)',
              borderRadius: 14,
              padding: 16,
              backdropFilter: 'blur(4px)',
              transform: 'translateY(-30px)',
            }}
          >
            <YayeAvatar size={48} withBadge />
            <div className="flex-1" style={{ color: '#fff' }}>
              <div className="font-black" style={{ fontSize: 13 }}>
                Yaye
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2, lineHeight: 1.45 }}>
                « Dis-moi ce que tu cherches — je m&apos;occupe du reste. »
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
