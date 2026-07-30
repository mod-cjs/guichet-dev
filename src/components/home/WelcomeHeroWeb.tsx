import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'

const STATS = [
  { value: '22 695', label: 'Jeunes inscrits' },
  { value: '1 240',  label: 'Opps actives'    },
  { value: '14',     label: 'Régions'         },
  { value: '9',      label: 'Centres CJS'     },
] as const

/**
 * Hero d'accueil desktop — affiché ≥ 1024px.
 *
 * Split layout (1.1fr / 1fr) :
 * - Gauche : eyebrow, titre 56px (trois piliers en jaune), lead, CTA plein
 *   unique + lien secondaire, stats row
 * - Droite : stack de cards visuelles (photo testimonial, opp preview, Yaye)
 *
 * Conforme `design-guichet-v5/web-onboarding.jsx#WebOnboard1Landing` (GUIC-689) :
 * « impact immédiat » — la proposition de valeur nomme emploi/formation/
 * financement, une seule action pleine (« Explorer les opportunités », jaune,
 * CTA sur fond sombre), inscription en lien souligné, pastilles type/urgence
 * distinctes sur la carte d'offre.
 */
export function WelcomeHeroWeb() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        color: 'var(--gj-surface)',
        background: 'linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)',
      }}
    >
      {/* glow jaune */}
      <span
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          right: -100,
          top: -120,
          width: 540,
          height: 540,
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--gj-yellow) 22%, transparent) 0%, transparent 60%)',
        }}
      />

      <div
        className="relative grid items-start"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '72px 64px',
          gridTemplateColumns: '1.1fr 1fr',
          gap: 48,
        }}
      >
        {/* LEFT — copy + CTAs + stats */}
        <div className="flex flex-col">
          <span
            className="inline-flex items-center gap-2 self-start font-black uppercase"
            style={{
              background: 'color-mix(in srgb, var(--gj-yellow) 22%, transparent)',
              color: 'var(--gj-yellow)',
              padding: '6px 12px',
              borderRadius: 999,
              letterSpacing: '.5px',
              fontSize: 11,
            }}
          >
            <Icon name="sparkle" size={12} aria-hidden />
            Le guichet unique du CJS
          </span>

          <h1
            className="font-black"
            style={{ fontSize: 48, lineHeight: 1.12, marginTop: 22, letterSpacing: '-1px', maxWidth: 560 }}
          >
            Accédez aux opportunités d&apos;<b style={{ color: 'var(--gj-yellow)' }}>emploi</b>, de{' '}
            <b style={{ color: 'var(--gj-yellow)' }}>formation</b> et de{' '}
            <b style={{ color: 'var(--gj-yellow)' }}>financement</b>.
          </h1>

          <p
            style={{ fontSize: 17, lineHeight: 1.55, marginTop: 18, opacity: 0.9, maxWidth: 540 }}
          >
            Pour les <b>16–35 ans au Sénégal</b>, en un seul endroit. Yaye t&apos;accompagne — en
            français ou en Wolof.
          </p>

          <div className="flex items-center" style={{ marginTop: 32, gap: 18 }}>
            <Link
              href="/opportunites"
              className="inline-flex items-center justify-center gap-2 font-black no-underline"
              style={{
                background: 'var(--gj-yellow)',
                color: 'var(--gj-ink)',
                fontSize: 15,
                minHeight: 56,
                padding: '0 24px',
                borderRadius: 12,
              }}
            >
              Explorer les opportunités
              <Icon name="arrow-right" size={16} aria-hidden />
            </Link>
            <Link
              href="/auth/connexion"
              className="inline-flex items-center justify-center font-bold"
              style={{
                background: 'transparent',
                color: 'var(--gj-surface)',
                border: 0,
                fontSize: 14,
                minHeight: 44,
                padding: '0 4px',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Créer mon compte · ou continuer avec WhatsApp
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
              <div key={s.label} className="flex flex-col gap-px">
                <span className="font-black" style={{ fontSize: 28, color: 'var(--gj-yellow)' }}>
                  {s.value}
                </span>
                <span
                  className="uppercase font-bold"
                  style={{ fontSize: 11, opacity: 0.8, letterSpacing: '.4px' }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — card stack visual */}
        <div className="relative flex flex-col" style={{ gap: 14 }}>
          <div
            className="relative overflow-hidden"
            style={{
              height: 220,
              borderRadius: 18,
              background: 'var(--gj-photo-slot)',
              boxShadow: '0 20px 50px rgba(0,0,0,.35)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(10,40,32,.7) 100%)' }}
            />
            <div className="absolute" style={{ left: 22, right: 22, bottom: 18, color: 'var(--gj-surface)' }}>
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
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                « Grâce au Guichet, j&apos;ai trouvé mon stage en agronomie en 3 semaines. »
              </span>
            </div>
          </div>

          <div
            className="flex flex-col"
            style={{
              background: 'var(--gj-surface)',
              borderRadius: 14,
              padding: 18,
              color: 'var(--gj-ink)',
              boxShadow: '0 20px 50px rgba(0,0,0,.25)',
              transform: 'translateY(-40px) translateX(-30px)',
              gap: 8,
              width: 320,
            }}
          >
            {/* Type et urgence : DEUX pastilles distinctes (retour design V3 §2) */}
            <div className="flex items-center" style={{ gap: 6 }}>
              <span
                className="font-black uppercase"
                style={{
                  fontSize: 11,
                  background: 'var(--cat-financement-soft)',
                  color: 'var(--cat-financement-ink)',
                  padding: '3px 8px',
                  borderRadius: 999,
                  letterSpacing: '.4px',
                }}
              >
                Financement
              </span>
              <span
                className="font-black uppercase"
                style={{
                  fontSize: 11,
                  background: 'var(--gj-red)',
                  color: 'var(--gj-surface)',
                  padding: '3px 8px',
                  borderRadius: 999,
                  letterSpacing: '.4px',
                }}
              >
                J-3
              </span>
            </div>
            <div className="flex items-center" style={{ gap: 10 }}>
              <div
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--gj-yellow-soft)',
                  color: 'var(--gj-yellow-ink)',
                }}
              >
                <Icon name="agriculture" size={20} aria-hidden />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>Bourse agricole — maraîchage</div>
                <div style={{ fontSize: 11, color: 'var(--gj-grey)', marginTop: 1 }}>
                  600 000 FCFA · Tambacounda
                </div>
              </div>
            </div>
            <div
              className="flex items-center font-black"
              style={{ gap: 5, fontSize: 11, color: 'var(--gj-green)' }}
            >
              <Icon name="sparkle" size={12} aria-hidden />
              94% match avec ton profil
            </div>
          </div>

          <div
            className="flex items-center"
            style={{
              background: 'rgba(255,255,255,.08)',
              border: '1.5px solid rgba(255,255,255,.18)',
              borderRadius: 14,
              padding: 16,
              gap: 12,
              backdropFilter: 'blur(4px)',
              transform: 'translateY(-30px)',
            }}
          >
            <YayeAvatar size={48} withBadge />
            <div className="flex-1" style={{ color: 'var(--gj-surface)' }}>
              <div className="flex items-center" style={{ gap: 6 }}>
                <span
                  data-testid="yaye-wordmark"
                  className="font-black"
                  style={{
                    fontSize: 14,
                    fontFamily: 'var(--gj-font-yaye-wordmark)',
                    background: 'linear-gradient(135deg, var(--gj-surface), var(--gj-yellow))',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  Yaye
                </span>
                <span
                  className="font-black uppercase"
                  style={{
                    fontSize: 9.5,
                    background: 'var(--gj-yellow)',
                    color: 'var(--gj-ink)',
                    padding: '1px 6px',
                    borderRadius: 999,
                    letterSpacing: '.4px',
                  }}
                >
                  IA
                </span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2, lineHeight: 1.45 }}>
                « Dis-moi ce que tu cherches — je m&apos;occupe du reste. »
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
