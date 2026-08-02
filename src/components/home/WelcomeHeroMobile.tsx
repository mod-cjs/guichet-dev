import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

const STATS = [
  { value: '22 695', label: 'Jeunes inscrits' },
  { value: '1 240',  label: 'Opps actives'    },
  { value: '14',     label: 'Régions'         },
] as const

/**
 * Hero d'accueil mobile — affiché < 1024px (la variante desktop a son propre layout split).
 * Container max-w-[480px] centré pour ne pas s'étirer sur tablette portrait.
 * Landing publique : stats CJS en snapshot (pas d'appel DB sur `/`).
 *
 * Conforme `design-guichet-v5/onboarding.jsx#Onboard1Welcome` (GUIC-689) :
 * titre trois-piliers visible sans défilement à 390px, UN SEUL bouton plein
 * (« Explorer les opportunités », jaune — CTA sur fond sombre), inscription
 * en lien secondaire souligné.
 */
export function WelcomeHeroMobile() {
  return (
    <div
      className="flex flex-col mx-auto"
      style={{
        minHeight: 'calc(100dvh - 3rem)',
        maxWidth: 480,
        background: 'var(--gj-ink-teal)',
        color: 'var(--gj-surface)',
      }}
    >
      <section
        className="relative flex-1 flex flex-col px-space-5 pt-space-5 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)',
        }}
      >
        <span
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: -120,
            right: -100,
            width: 340,
            height: 340,
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--gj-yellow) 28%, transparent) 0%, transparent 60%)',
          }}
        />
        <span
          className="relative inline-flex items-center gap-1 self-start text-fs-100 font-black uppercase"
          style={{
            background: 'color-mix(in srgb, var(--gj-yellow) 22%, transparent)',
            color: 'var(--gj-yellow)',
            padding: '5px 10px',
            borderRadius: 999,
            letterSpacing: '.5px',
            marginTop: 24,
          }}
        >
          Le guichet unique du CJS
        </span>
        <h1
          className="relative font-black"
          style={{ fontSize: 32, lineHeight: 1.1, marginTop: 24 }}
        >
          Emploi, formation, financement — au même endroit.
        </h1>
        <p
          className="relative text-fs-300"
          style={{ marginTop: 14, opacity: 0.85, lineHeight: 1.5 }}
        >
          Pour les 16–35 ans, partout au Sénégal. Yaye t&apos;accompagne — en français ou en Wolof.
        </p>

        <div
          className="relative overflow-hidden"
          style={{
            margin: '32px -22px 0',
            height: 220,
            background: 'var(--gj-photo-slot)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(0,40,32,0) 0%, rgba(10,40,32,.7) 100%)' }}
          />
          <div
            className="absolute flex items-center gap-1 text-fs-100 font-bold"
            style={{ left: 22, right: 22, bottom: 18, color: 'var(--gj-surface)' }}
          >
            <Icon name="sparkle" size={14} style={{ color: 'var(--gj-yellow)' }} aria-hidden />
            <span>« Grâce au Guichet, j&apos;ai trouvé mon stage en 3 semaines. » — Aïssatou, 23 ans, Thiès</span>
          </div>
        </div>

        <div
          className="relative flex justify-around py-space-3"
          style={{ borderTop: '1px solid rgba(255,255,255,.12)' }}
        >
          {STATS.map(s => (
            <div key={s.label} className="flex flex-col items-center gap-px">
              <span className="font-black" style={{ fontSize: 22, color: 'var(--gj-yellow)' }}>{s.value}</span>
              <span
                className="text-fs-100 uppercase font-bold"
                style={{ opacity: 0.8, letterSpacing: '.4px' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Barre d'action de fin d'écran : signalée au bouton flottant Yaye pour
          qu'il remonte au-dessus (GUIC-689, règle handoff v5). */}
      <div
        data-fab-clearance
        className="flex-shrink-0 px-space-5"
        style={{
          background: 'var(--gj-ink-teal)',
          padding: '18px 22px 22px',
          paddingBottom: 'calc(22px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Link
          href="/opportunites"
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
          <span>Explorer les opportunités</span>
          <Icon name="arrow-right" size={16} aria-hidden />
        </Link>
        <Link
          href="/auth/connexion"
          className="inline-flex items-center justify-center w-full font-bold mt-space-2"
          style={{
            background: 'transparent',
            color: 'var(--gj-surface)',
            border: 0,
            fontSize: 14,
            minHeight: 44,
            borderRadius: 12,
            padding: '0 18px',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Créer mon compte · j&apos;ai déjà un compte
        </Link>
      </div>
    </div>
  )
}
