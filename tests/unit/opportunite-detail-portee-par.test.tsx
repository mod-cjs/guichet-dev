/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Bandeau « Offre portée par » (gage de crédibilité).
 *
 * Engagement explicite du retour design V3 (§4) et présent dans la maquette
 * (`lot3-opps-web.jsx:549-560`) : sous le contenu, une bande rappelle QUI porte
 * l'offre. Pour un jeune qui hésite à confier son dossier, savoir que l'offre
 * est relayée par un programme du réseau change la décision.
 *
 * Ce que la maquette affiche vraiment : une pastille avec l'initiale + le nom
 * (pas de fichier logo — `Organisation.logoUrl` est d'ailleurs vide partout en
 * base). On rend donc l'organisme, les programmes de rattachement réels
 * (GUIC-684) et le CJS, opérateur de la plateforme.
 */
import { render, screen, within } from '@testing-library/react'

import { OpportuniteDetail } from '@/components/opportunites/OpportuniteDetail'
import { FavorisProvider } from '@/components/opportunites/FavorisProvider'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  usePathname: () => '/opportunites/x',
  useSearchParams: () => new URLSearchParams(''),
}))

function renderDetail(over: Record<string, unknown> = {}) {
  const detail = {
    id: 'o1',
    slug: 'offre-x',
    titre: 'Technicien en aviculture',
    description: 'Description.',
    type: 'Emploi',
    domaine: 'Agriculture',
    region: 'Thies',
    organisation: 'GIE Agropole Sud',
    remuneration: 'Salaire négociable',
    deadline: '2026-09-05T00:00:00.000Z',
    vues: 12,
    tags: [],
    skills: [],
    programmes: [{ slug: 'yeah', nom: 'YEAH' }],
    details: null,
    ...over,
  } as never
  return render(
    <FavorisProvider isAuthenticated={false}>
      <OpportuniteDetail viewer={null as never} detail={detail} />
    </FavorisProvider>,
  )
}

describe('GUIC-689 — bandeau « Offre portée par »', () => {
  it('affiche l’organisme qui porte l’offre', () => {
    renderDetail()
    const bandeau = screen.getByTestId('offre-portee-par')
    expect(within(bandeau).getByText('GIE Agropole Sud')).toBeInTheDocument()
  })

  it('affiche le programme de rattachement réel', () => {
    renderDetail()
    const bandeau = screen.getByTestId('offre-portee-par')
    expect(within(bandeau).getByText('YEAH')).toBeInTheDocument()
  })

  it('mentionne le CJS, opérateur de la plateforme', () => {
    renderDetail()
    const bandeau = screen.getByTestId('offre-portee-par')
    expect(within(bandeau).getByText(/consortium jeunesse|CJS/i)).toBeInTheDocument()
  })

  it('sans programme de rattachement : organisme et CJS seulement, aucun vide', () => {
    renderDetail({ programmes: [] })
    const bandeau = screen.getByTestId('offre-portee-par')
    expect(within(bandeau).getByText('GIE Agropole Sud')).toBeInTheDocument()
    expect(bandeau.textContent).not.toMatch(/undefined|null/i)
  })
})
