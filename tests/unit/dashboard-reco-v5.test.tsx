/**
 * @jest-environment jsdom
 *
 * GUIC-689 (vague 2) — Recommandations du tableau de bord jeune.
 *
 * Deux règles v5 étaient violées ensemble sur cet écran :
 *  - « une catégorie = une couleur, partout » : la couleur du badge était
 *    déduite du NOMBRE DE JOURS restants (`recoTone`), jamais du type d'offre,
 *    donc la catégorie n'était jamais lisible sur le dashboard ;
 *  - « type et urgence sont deux pastilles distinctes » : un badge unique
 *    fusionnait les deux (« Emploi · J-3 »), teinté en rouge par l'urgence —
 *    alors que le rouge ne code QUE l'urgence d'échéance.
 * S'y ajoute le P1 de l'audit UX (« dashboard encore textuel ») : les cartes
 * n'avaient aucun repère visuel, seulement du texte empilé.
 */
import { render, screen, within } from '@testing-library/react'

import { OpportunitesRecoCarousel, type OppRecoCard } from '@/components/dashboard/OpportunitesRecoCarousel'

// `over` est volontairement non typé : ce test décrit le contrat CIBLE
// (`type`, `joursRestants`) que `OppRecoCard` doit adopter — il doit donc
// compiler avant que le champ n'existe, tout en échouant au rendu.
function card(over: Record<string, unknown> = {}): OppRecoCard {
  return {
    id: 'o1',
    type: 'Emploi',
    title: 'Technicien en aviculture',
    org: 'GIE Agropole Sud',
    href: '/opportunites/technicien-en-aviculture',
    ...over,
  } as unknown as OppRecoCard
}

describe('GUIC-689 — deux pastilles distinctes (type / urgence)', () => {
  it('la catégorie a sa propre pastille, colorée par la famille --cat-*', () => {
    render(<OpportunitesRecoCarousel items={[card({ type: 'Stage' })]} />)
    const chip = document.querySelector('[data-cat]') as HTMLElement
    expect(chip).toHaveTextContent(/stage/i)
    expect(chip.className).toMatch(/cat-stage/)
  })

  it('la pastille d’urgence est séparée et n’apparaît que si l’échéance est proche', () => {
    render(<OpportunitesRecoCarousel items={[card({ joursRestants: 3 })]} />)
    const urgence = screen.getByTestId('reco-urgence')
    expect(urgence).toHaveTextContent('J-3')
    // la catégorie ne porte jamais le rouge de l'urgence
    expect((document.querySelector('[data-cat]') as HTMLElement).className).not.toMatch(/red/)
  })

  it('sans échéance proche : aucune pastille d’urgence', () => {
    render(<OpportunitesRecoCarousel items={[card({ joursRestants: 30 })]} />)
    expect(screen.queryByTestId('reco-urgence')).not.toBeInTheDocument()
  })

  it('le libellé fusionné « Type · J-N » a disparu', () => {
    render(<OpportunitesRecoCarousel items={[card({ type: 'Emploi', joursRestants: 3 })]} />)
    expect(screen.queryByText(/emploi\s*·\s*j-3/i)).not.toBeInTheDocument()
  })
})

describe('GUIC-689 — tuile sectorielle (P1 « dashboard textuel »)', () => {
  it('chaque carte porte un repère visuel de catégorie (aplat + icône)', () => {
    render(<OpportunitesRecoCarousel items={[card({ type: 'Formation' })]} />)
    const tuile = screen.getByTestId('reco-tuile')
    expect(tuile.className).toMatch(/cat-formation/)
    expect(within(tuile).getByRole('presentation', { hidden: true })).toBeInTheDocument()
  })

  it('aucun dégradé sur la tuile (consigne projet : aplats)', () => {
    render(<OpportunitesRecoCarousel items={[card()]} />)
    const tuile = screen.getByTestId('reco-tuile')
    expect(tuile.className).not.toMatch(/gradient/)
    expect(tuile.getAttribute('style') ?? '').not.toMatch(/gradient/)
  })
})
