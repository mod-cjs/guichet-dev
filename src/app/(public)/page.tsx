import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { WelcomeHero } from '@/components/home/WelcomeHero'
import { getSession } from '@/lib/auth'

export const metadata: Metadata = { title: 'Accueil' }

const SECTIONS = [
  { href: '/opportunites', label: 'Opportunités',  desc: 'Emplois, stages, formations, bourses' },
  { href: '/agenda',       label: 'Agenda',        desc: 'Agenda et activités du réseau CJS' },
  { href: '/ressources',   label: 'Ressources',    desc: 'Bibliothèque pédagogique' },
  { href: '/centres',      label: 'Centres CJS',   desc: '9 centres à travers le Sénégal' },
]

export default async function Accueil() {
  const session = await getSession()
  if (session) {
    redirect(session.onboardingComplete ? '/jeune/tableau-de-bord' : '/jeune/onboarding/telephone')
  }

  return (
    <>
      <WelcomeHero />

      <section className="container-page py-space-7">
        <h2 className="text-fs-700 font-black text-color-text-primary mb-space-5">
          Nos services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-4">
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href}
              className="block bg-white border border-color-border-default rounded-gj-xl
                p-space-4 hover:border-gj-teal hover:shadow-gj-sm transition-all no-underline group">
              <h3 className="text-fs-400 font-bold text-color-text-primary mb-space-1
                group-hover:text-color-action-primary transition-colors">
                {s.label}
              </h3>
              <p className="text-fs-200 text-color-text-muted">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
