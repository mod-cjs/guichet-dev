/**
 * GUIC-689 — CTA de conversion magenta.
 *
 * `<EvenementInscriptionCta />` : seul l'état inscriptible (« S'inscrire —
 * c'est gratuit ») porte la couleur d'action de conversion (`bg-gj-action`).
 * Les états secondaires (désinscription, fermées, complet) gardent leur
 * style actuel — jamais deux CTA pleins sur le même écran.
 */
import { render, screen } from '@testing-library/react'
import { EvenementInscriptionCta } from '@/components/evenements/EvenementInscriptionCta'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/agenda/1',
}))

describe('<EvenementInscriptionCta /> — CTA de conversion magenta', () => {
  it('« S’inscrire — c’est gratuit » (état inscriptible) porte bg-gj-action', () => {
    render(
      <EvenementInscriptionCta
        evenementId="e1"
        isAuthenticated
        initialInscrit={false}
        ouvertInscription
        complet={false}
      />,
    )
    const btn = screen.getByRole('button', { name: /s'inscrire — c'est gratuit/i })
    expect(btn.className).toMatch(/bg-gj-action/)
  })

  it('« Se désinscrire » (déjà inscrit·e) ne porte PAS bg-gj-action', () => {
    render(
      <EvenementInscriptionCta
        evenementId="e1"
        isAuthenticated
        initialInscrit
        ouvertInscription
        complet={false}
      />,
    )
    const btn = screen.getByRole('button', { name: /se désinscrire/i })
    expect(btn.className).not.toMatch(/bg-gj-action/)
  })

  it('« Inscriptions fermées » ne porte PAS bg-gj-action', () => {
    render(
      <EvenementInscriptionCta
        evenementId="e1"
        isAuthenticated={false}
        initialInscrit={false}
        ouvertInscription={false}
        complet={false}
      />,
    )
    const btn = screen.getByRole('button', { name: /inscriptions fermées/i })
    expect(btn.className).not.toMatch(/bg-gj-action/)
  })

  it('« Complet » ne porte PAS bg-gj-action', () => {
    render(
      <EvenementInscriptionCta
        evenementId="e1"
        isAuthenticated
        initialInscrit={false}
        ouvertInscription
        complet
      />,
    )
    const btn = screen.getByRole('button', { name: /événement complet/i })
    expect(btn.className).not.toMatch(/bg-gj-action/)
  })
})
