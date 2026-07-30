/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Corrections issues de l'audit VISUEL de la vague 1 (rendu réel,
 * build prod, 390/1440px). Ces défauts ne pouvaient pas être vus par les tests
 * unitaires existants : ils naissent de la composition (règle CSS globale,
 * mapping de couleurs, empilement de boutons).
 *
 * F-1 : liens du footer illisibles sur le navy (1.93:1 mesuré) — la règle
 *       globale `a { color: var(--color-text-link) }` de globals.css gagne sur
 *       la couleur héritée du conteneur.
 * F-2 : le rouge code un TYPE (Conférence, PDF) alors que v5 le réserve
 *       strictement à l'urgence d'échéance.
 * F-3 : « Se connecter pour s'inscrire » resté teal alors que l'équivalent
 *       côté offre est passé magenta (même geste de conversion).
 * F-4 : listes agenda — un bouton plein par carte (4+ actions pleines à
 *       l'écran) au lieu de boutons de rangée secondaires.
 * F-7 : le bouton flottant Yaye chevauche les barres d'action épinglées.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@testing-library/react'

import { EventCard } from '@/components/evenements/EventCard'
import { EvenementCard } from '@/components/evenements/EvenementCard'
import { EvenementInscriptionCta } from '@/components/evenements/EvenementInscriptionCta'
import { Footer } from '@/components/layout/Footer'
import { RessourceDetailHero } from '@/components/ressources/RessourceDetailHero'
import { YayeFab } from '@/components/ui/Yaye/YayeFab'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/agenda/e1',
}))

const ROOT = resolve(__dirname, '../..')

const evenement = {
  id: 'e1',
  titre: 'Conference — Métiers du numérique',
  description: 'Session démo.',
  type: 'Conference' as const,
  statut: 'a_venir' as const,
  dateDebut: '2026-08-02T15:09:00.000Z',
  dateFin: null,
  lieu: 'CJS Thiès',
  organisation: 'CJS Sédhiou',
  estGratuit: true,
  capaciteMax: 110,
}

describe('F-1 — liens du footer lisibles sur le navy', () => {
  it('chaque lien du footer porte une couleur claire explicite (pas la couleur de lien globale)', () => {
    render(<Footer />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(4)
    for (const link of links) {
      // une classe de couleur explicite (pas seulement un `hover:`) doit exister
      // sur le <a> lui-même, sinon `a { color: var(--color-text-link) }`
      // (globals.css) l'emporte et repeint le lien en teal sur le navy.
      expect(link.className).toMatch(/(^|\s)text-(white|gj-surface)/)
    }
  })

  it('la règle globale a{} de globals.css ne s’applique plus aux surfaces sombres', () => {
    const css = readFileSync(resolve(ROOT, 'src/styles/globals.css'), 'utf-8')
    // La règle nue `a { color: ... }` doit être scopée pour ne pas repeindre
    // les liens posés sur fond sombre.
    expect(css).not.toMatch(/^\s{2}a\s*\{\s*color:/m)
  })

  it('le scope reste à spécificité nulle (:where) — sinon il écrase les classes utilitaires', () => {
    const css = readFileSync(resolve(ROOT, 'src/styles/globals.css'), 'utf-8')
    // Régression observée au rendu : `a:not(...)` monte à (0,1,2) et repeint
    // les pastilles blanches posées sur les covers d'événements.
    expect(css).toMatch(/a:where\(:not\(\[data-surface="dark"\] a\)\)/)
    expect(css).not.toMatch(/^\s*a:not\(/m)
  })
})

describe('F-2 — le rouge ne code jamais un type', () => {
  it('EventCard : le type Conférence n’utilise pas la palette rouge', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/evenements/EventCard.tsx'), 'utf-8')
    const ligne = src.split('\n').find((l) => l.includes('Conference:')) ?? ''
    expect(ligne).not.toMatch(/red/)
  })

  it('EvenementCard : badge Conférence non rouge', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/evenements/EvenementCard.tsx'), 'utf-8')
    const bloc = src.slice(src.indexOf('TYPE_BADGE'), src.indexOf('TYPE_ICON'))
    expect(bloc).not.toMatch(/Conference:\s*'red'/)
  })

  it('RessourceDetailHero : le type PDF n’utilise pas la palette rouge', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/ressources/RessourceDetailHero.tsx'), 'utf-8')
    const ligne = src.split('\n').find((l) => l.trim().startsWith('PDF:')) ?? ''
    expect(ligne).not.toMatch(/red/)
  })
})

describe('F-3 — « Se connecter pour s’inscrire » est un CTA de conversion', () => {
  it('état anonyme : bouton magenta (variant cta)', () => {
    render(
      <EvenementInscriptionCta
        evenementId="e1"
        isAuthenticated={false}
        initialInscrit={false}
        complet={false}
        ouvertInscription
      />,
    )
    const btn = screen.getByRole('button', { name: /se connecter pour s’inscrire|se connecter pour s'inscrire/i })
    expect(btn.className).toMatch(/bg-gj-action/)
  })
})

describe('F-4 — listes agenda : boutons de rangée secondaires', () => {
  // Un bouton de rangée est « creux » : fond blanc + bordure. Il ne doit porter
  // ni le plein teal (primary) ni le magenta (conversion).
  const estCreux = (className: string) =>
    /(^|\s)bg-white(\s|$)/.test(className) &&
    !/(^|\s)bg-gj-teal(\s|$)/.test(className) &&
    !/(^|\s)bg-gj-action(\s|$)/.test(className)

  it('EventCard anonyme : le CTA de rangée n’est pas un bouton plein', () => {
    render(<EventCard item={evenement} isAuthenticated={false} />)
    const btn = screen.getByRole('button', { name: /se connecter/i })
    expect(estCreux(btn.className)).toBe(true)
  })

  it('EvenementCard anonyme : le CTA de rangée n’est pas un bouton plein', () => {
    render(<EvenementCard item={evenement} isAuthenticated={false} />)
    const btn = screen.getByRole('button', { name: /se connecter/i })
    expect(estCreux(btn.className)).toBe(true)
  })
})

describe('F-7 — bouton flottant Yaye : dégagement piloté par token', () => {
  // NB : jsdom (cssstyle) supprime silencieusement toute valeur inline
  // contenant `var()` — l'assertion se fait donc sur la source.
  it('YayeFab sans prop bottom s’appuie sur --gj-fab-offset', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/ui/Yaye/YayeFab/index.tsx'), 'utf-8')
    expect(src).toMatch(/var\(--gj-fab-offset/)
    render(<YayeFab />)
    expect(screen.getByRole('button', { name: /yaye/i })).toBeInTheDocument()
  })

  it('globals.css définit le dégagement (bottom-nav + barres d’action épinglées)', () => {
    const css = readFileSync(resolve(ROOT, 'src/styles/globals.css'), 'utf-8')
    expect(css).toMatch(/--gj-fab-offset/)
    expect(css).toMatch(/data-fab-clearance/)
  })

  it('le hero mobile déclare sa barre d’action épinglée', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/home/WelcomeHeroMobile.tsx'), 'utf-8')
    expect(src).toContain('data-fab-clearance')
  })
})

describe('F-6 — stabilité des KPI centres', () => {
  it('le filtre région envoie la value brute au tracking, pas le libellé affiché', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/app/(public)/centres/centres-all-client.tsx'),
      'utf-8',
    )
    // Les chips affichent « Saint-Louis » (lisible), mais les KPI de
    // fréquentation doivent continuer de recevoir « Saint_Louis » — sinon une
    // même région est comptée sous deux formes de part et d'autre du déploiement.
    const bloc = src.slice(src.indexOf('handleRegionChange'), src.indexOf('handleRegionChange') + 600)
    expect(bloc).toMatch(/valueBrute/)
    expect(bloc).not.toMatch(/value:\s*v\s*\}/)
  })
})
