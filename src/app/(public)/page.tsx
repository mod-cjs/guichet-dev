import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { WelcomeHeroMobile } from '@/components/home/WelcomeHeroMobile'
import { WelcomeHeroWeb } from '@/components/home/WelcomeHeroWeb'
import { Icon } from '@/components/ui/Icon'
import { getSession } from '@/lib/auth'

export const metadata: Metadata = { title: 'Accueil' }

const SECTIONS = [
  { href: '/opportunites', icon: 'target',      label: 'Opportunités', desc: 'Emplois, stages, formations, bourses' },
  { href: '/agenda',       icon: 'calendar',    label: 'Agenda',       desc: 'Agenda et activités du réseau CJS' },
  { href: '/ressources',   icon: 'document',    label: 'Ressources',   desc: 'Bibliothèque pédagogique' },
  { href: '/centres',      icon: 'pin',         label: 'Centres CJS',  desc: '9 centres à travers le Sénégal' },
] as const

export default async function Accueil() {
  const session = await getSession()
  if (session) {
    redirect(session.onboardingComplete ? '/jeune/tableau-de-bord' : '/jeune/onboarding/objectifs')
  }

  return (
    <>
      {/* HERO responsive — mobile (< 1024px) vs web (≥ 1024px) */}
      <div className="lg:hidden">
        <WelcomeHeroMobile />
      </div>
      <div className="hidden lg:block">
        <WelcomeHeroWeb />
      </div>

      {/* SECTIONS services — container max-w-7xl centré, padding cohérent */}
      <section
        className="mx-auto"
        style={{ maxWidth: 1280, padding: '64px 24px' }}
      >
        <div className="mb-space-6">
          <h2
            className="font-black"
            style={{ fontSize: 28, color: 'var(--gj-teal-deep)', letterSpacing: '-0.3px' }}
          >
            Tout pour ton parcours
          </h2>
          <p
            style={{ fontSize: 15, color: 'var(--gj-grey)', marginTop: 8, maxWidth: 540 }}
          >
            Le Guichet rassemble les opportunités, l&apos;agenda, les ressources et les centres CJS
            dans une seule app.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-4">
          {SECTIONS.map(s => (
            <Link
              key={s.href}
              href={s.href}
              className="flex flex-col no-underline group transition-all"
              style={{
                background: 'var(--gj-surface)',
                border: '1.5px solid var(--gj-line)',
                borderRadius: 16,
                padding: 24,
                minHeight: 180,
              }}
            >
              <div
                className="inline-flex items-center justify-center flex-shrink-0 mb-space-3"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'var(--gj-teal-soft, rgba(10,128,127,.1))',
                  color: 'var(--gj-teal-deep)',
                }}
              >
                <Icon name={s.icon} size={24} aria-hidden />
              </div>
              <h3
                className="font-black"
                style={{ fontSize: 17, color: 'var(--gj-ink)', marginBottom: 4 }}
              >
                {s.label}
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--gj-grey)', lineHeight: 1.45 }}>
                {s.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
