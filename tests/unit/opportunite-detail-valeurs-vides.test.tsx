/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Une valeur techniquement présente peut être sémantiquement vide.
 *
 * Constaté au rendu réel sur une bourse : la fiche affichait
 * « MONTANT — 0 FCFA » et « ORGANISME FINANCEUR — À renseigner ».
 * En base, `montant_total_fcfa = 0` et `organisme_financeur = 'À renseigner'`
 * sont des marqueurs de remplissage, pas des informations.
 *
 * Les afficher est pire que de ne rien afficher :
 *  - « 0 FCFA » laisse croire que la bourse ne verse rien ;
 *  - « À renseigner » fait fuiter un marqueur interne vers le public.
 *
 * Une cellule ne doit apparaître que si sa valeur apprend quelque chose.
 */
import { render, screen } from '@testing-library/react'

import { OpportuniteDetail } from '@/components/opportunites/OpportuniteDetail'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  usePathname: () => '/opportunites/x',
  useSearchParams: () => new URLSearchParams(''),
}))

function detailBourse(payload: Record<string, unknown>) {
  return {
    id: 'o1',
    slug: 'bourse-x',
    titre: 'Bourse résidence artistique',
    description: 'Description.',
    type: 'Bourse',
    domaine: 'Culture',
    region: 'Ziguinchor',
    organisation: 'ONG Aide et Action',
    remuneration: 'Bourse et hébergement',
    deadline: '2026-08-05T00:00:00.000Z',
    vues: 52,
    tags: [],
    skills: [],
    programmes: [],
    details: { type: 'bourse', payload },
  } as never
}

describe('GUIC-689 — valeurs sémantiquement vides jamais affichées', () => {
  it('un montant à 0 n’est pas présenté comme une information', () => {
    render(<OpportuniteDetail viewer={null as never} detail={detailBourse({ montantTotalFcfa: 0, organismeFinanceur: 'Fondation X' })} />)
    expect(screen.queryByText(/^0\s*FCFA$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/montant/i)).not.toBeInTheDocument()
  })

  it('un marqueur de remplissage (« À renseigner ») ne fuit pas vers l’utilisateur', () => {
    render(<OpportuniteDetail viewer={null as never} detail={detailBourse({ montantTotalFcfa: 500000, organismeFinanceur: 'À renseigner' })} />)
    expect(screen.queryByText(/à renseigner/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/organisme financeur/i)).not.toBeInTheDocument()
  })

  it('les valeurs réelles restent affichées', () => {
    render(<OpportuniteDetail viewer={null as never} detail={detailBourse({ montantTotalFcfa: 500000, organismeFinanceur: 'Fondation X' })} />)
    expect(screen.getByText(/organisme financeur/i)).toBeInTheDocument()
    expect(screen.getByText('Fondation X')).toBeInTheDocument()
    expect(screen.getByText(/500\s?000\s*FCFA/)).toBeInTheDocument()
  })
})
