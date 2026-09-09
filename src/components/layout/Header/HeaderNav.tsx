'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { LIENS_EXTERNES, lienActif, type LienNav } from './nav-partage'

interface Props {
  isAuthenticated: boolean
  /**
   * GUIC-706 — liens À AFFICHER, déjà filtrés par le Header (composant serveur).
   *
   * Le composant ne reçoit AUCUNE clé de flag : les props d'un composant client sont
   * sérialisées dans le HTML, et une liste de clés annoncerait les fonctionnalités cachées
   * à tout visiteur, connecté ou non.
   */
  liensPublics: readonly LienNav[]
  /** Liens de l'espace connecté, déjà filtrés. */
  liensConnecte: readonly LienNav[]
}

export function HeaderNav({ isAuthenticated, liensPublics, liensConnecte }: Props) {
  // usePathname() peut retourner null (Storybook hors contexte Next router,
  // ou edge case rendu) — on retombe sur '/' qui ne matchera que la home.
  const pathname = usePathname() ?? '/'

  return (
    <nav className="hidden md:flex items-center">
      {liensPublics.map(link => {
        const active = lienActif(link, pathname)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`px-[8px] text-[11px] no-underline whitespace-nowrap flex-shrink-0 transition-colors
              border-b-[3px] ${active
                ? 'text-gj-teal-deep border-gj-teal bg-gj-teal-soft/40'
                : 'text-gj-grey hover:text-gj-teal hover:bg-gj-teal-soft border-transparent'
              }`}
            style={{ paddingTop: 13, paddingBottom: 13 }}
          >
            {link.label}
          </Link>
        )
      })}

      {LIENS_EXTERNES.map(link => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${link.label} (ouvre dans un nouvel onglet)`}
          className="px-[8px] text-[11px] no-underline whitespace-nowrap flex-shrink-0 transition-colors
            border-b-[3px] text-gj-grey hover:text-gj-teal hover:bg-gj-teal-soft border-transparent
            inline-flex items-center gap-1"
          style={{ paddingTop: 13, paddingBottom: 13 }}
        >
          {link.label}
          <Icon name="external" size={10} />
        </a>
      ))}

      {isAuthenticated && (
        <>
          <span className="mx-[6px] h-5 w-px bg-gj-line" aria-hidden />
          {liensConnecte.map(link => {
            const active = lienActif(link, pathname)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`px-[8px] text-[11px] font-bold no-underline whitespace-nowrap flex-shrink-0
                  transition-colors border-b-[3px] ${active
                    ? 'text-gj-teal-deep border-gj-teal bg-gj-teal-soft/40'
                    : 'text-gj-teal-deep hover:bg-gj-teal-soft border-transparent'
                  }`}
                style={{ paddingTop: 13, paddingBottom: 13 }}
              >
                {link.label}
              </Link>
            )
          })}
        </>
      )}
    </nav>
  )
}
