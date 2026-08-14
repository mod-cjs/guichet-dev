import Link from 'next/link'
import { LIENS_FOOTER_LEGAUX } from '@/content/legal'
import { lienMasque } from '@/lib/flags/ui'

/**
 * GUIC-706 — les « liens rapides » du pied de page sont une navigation comme une autre.
 * Ils avaient échappé au décompte des barres de navigation : un module masqué y restait
 * annoncé, sur TOUTES les pages publiques.
 */
const LIENS_RAPIDES = [
  { href: '/opportunites', label: 'Opportunités' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/ressources', label: 'Ressources' },
  { href: '/centres', label: 'Centres CJS' },
]

export function Footer({ masques = [] }: { masques?: readonly string[] } = {}) {
  // Les masques sont calculés par le layout, qui dispose déjà de la session : les lire ici
  // ferait entrer toute la chaîne d'authentification dans un composant purement
  // présentationnel — et dans les tests qui le rendent.
  const liensRapides = LIENS_RAPIDES.filter((l) => !lienMasque(l.href, masques))
  return (
    <footer className="bg-gj-ink-teal text-white mt-16" data-surface="dark">
      <div className="container-page py-space-7 grid grid-cols-1 md:grid-cols-3 gap-space-6">
        <div>
          <h3 className="text-gj-yellow font-bold text-fs-300 mb-space-3">Guichet Jeunesse</h3>
          <p className="text-white/60 text-fs-200">
            Portail numérique du Consortium Jeunesse Sénégal.<br />
            Opportunités, formations et ressources pour les jeunes.
          </p>
        </div>
        <div>
          <h3 className="text-gj-yellow font-bold text-fs-300 mb-space-3">Liens rapides</h3>
          <ul className="flex flex-col gap-space-2 text-fs-200 text-white/60">
            {liensRapides.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/80 hover:text-white no-underline transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-gj-yellow font-bold text-fs-300 mb-space-3">Contact</h3>
          <p className="text-white/60 text-fs-200">
            Consortium Jeunesse Sénégal<br />
            Dakar, Sénégal
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page py-space-3 flex flex-wrap gap-x-space-4 gap-y-space-2 justify-center text-fs-100 text-white/60">
          {/* GUIC-605 — liens dérivés du registre `src/content/legal` : un document
              retiré du registre disparaît d'ici, au lieu d'y laisser un lien mort. */}
          {LIENS_FOOTER_LEGAUX.map(({ slug, libelle }) => (
            <Link
              key={slug}
              href={`/legal/${slug}`}
              className="text-white/80 hover:text-white no-underline transition-colors"
            >
              {libelle}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 py-space-3">
        <p className="text-center text-white/30 text-fs-100">
          © {new Date().getFullYear()} Consortium Jeunesse Sénégal — Tous droits réservés
        </p>
      </div>
    </footer>
  )
}
