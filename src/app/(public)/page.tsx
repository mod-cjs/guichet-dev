import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Accueil' }

const SECTIONS = [
  { href: '/opportunites', label: 'Opportunités',  desc: 'Emplois, stages, formations, bourses' },
  { href: '/agenda',       label: 'Agenda',        desc: 'Agenda et activités du réseau CJS' },
  { href: '/ressources',   label: 'Ressources',    desc: 'Bibliothèque pédagogique' },
  { href: '/centres',      label: 'Centres CJS',   desc: '9 centres à travers le Sénégal' },
]

export default function Accueil() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gj-teal text-white">
        <div className="container-page py-space-8">
          <h1 className="text-fs-900 font-black leading-tight mb-space-3">
            Le Guichet<br />Jeunesse Sénégal
          </h1>
          <p className="text-fs-500 text-white/80 mb-space-5 max-w-[540px]">
            Opportunités, formations et ressources pour les jeunes du Sénégal.
          </p>
          <div className="flex flex-wrap gap-space-3">
            <Link href="/opportunites"
              className="bg-gj-yellow text-gj-ink font-bold px-space-5 py-space-3
                rounded-gj-md hover:opacity-90 transition-opacity no-underline text-fs-400">
              Voir les opportunités
            </Link>
            <Link href="/auth/connexion"
              className="bg-white/15 text-white border border-white/30 font-bold
                px-space-5 py-space-3 rounded-gj-md hover:bg-white/25 transition-colors
                no-underline text-fs-400">
              Créer mon profil
            </Link>
          </div>
        </div>
      </section>

      {/* Sections */}
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
