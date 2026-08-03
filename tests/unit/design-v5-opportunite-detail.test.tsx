/**
 * @jest-environment jsdom
 *
 * GUIC-691 — Conformité v5 du détail d'opportunité (Lot 3, `WebOppSlideOver`).
 *
 * Ces tests portent les RÈGLES OPPOSABLES du handoff, pas des pixels :
 *  - le magenta `--gj-action` est réservé aux CTA de conversion (Postuler) ;
 *    le teal porte la marque et la navigation — jamais l'inverse ;
 *  - la couleur de la pastille de type se DÉDUIT de la catégorie (`--cat-*`) ;
 *  - le rouge ne signale QUE l'urgence d'échéance, et vit dans sa propre
 *    pastille, séparée du type.
 *
 * Arbitrage tracé (registre É-25, ex-É-08) : le lot 3 peint la pastille de catégorie en
 * aplat plein + texte blanc, le Lot 14 — normatif — la définit en `soft/ink`.
 * On suit le Lot 14.
 */
import { render, screen } from '@testing-library/react'
import { OpportuniteDetail } from '@/components/opportunites/OpportuniteDetail'
import { FavorisProvider } from '@/components/opportunites/FavorisProvider'
import type { OpportuniteDetail as Detail } from '@/types/candidature'

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}))

jest.mock('next/dynamic', () => () => {
  // eslint-disable-next-line react/display-name
  return function DynamicStub() {
    return null
  }
})

const baseDetail: Detail = {
  id: 'opp-1',
  slug: 'stage-data-science',
  titre: 'Stage Data Science · 6 mois',
  description: 'Rejoins la cellule Innovation.',
  type: 'STAGE',
  domaine: 'TECH',
  region: 'DAKAR',
  organisation: 'Sonatel',
  remuneration: '350 000 F/mois',
  deadline: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  lienExterne: null,
  vues: 12,
  statut: 'PUBLIE',
  programme: null,
  typeSlug: 'stage',
  actionLabel: 'Postuler maintenant',
  requiresFileUpload: true,
  fileLabel: 'CV',
  skills: [],
  tags: [],
  details: null,
} as unknown as Detail

const viewer = { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' }

function renderDetail(detail: Detail = baseDetail, withViewer = true) {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) }) as unknown as Response)
  return render(
    <FavorisProvider isAuthenticated={withViewer}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <OpportuniteDetail detail={detail} viewer={withViewer ? (viewer as any) : null} />
    </FavorisProvider>,
  )
}

describe('GUIC-691 — détail opportunité conforme v5', () => {
  describe('CTA de conversion', () => {
    it('porte le magenta de conversion et non le teal de navigation', () => {
      renderDetail()
      const cta = screen.getByRole('button', { name: /Postuler maintenant/i })
      expect(cta).toHaveClass('gj-cta')
      expect(cta.className).not.toMatch(/bg-gj-teal/)
    })

    it('vaut aussi pour l’invitation à se connecter, qui mène au même geste', () => {
      renderDetail(baseDetail, false)
      const lien = screen.getByRole('link', { name: /Se connecter pour postuler/i })
      expect(lien).toHaveClass('gj-cta')
      expect(lien.className).not.toMatch(/bg-gj-teal/)
    })
  })

  describe('pastille de catégorie', () => {
    it('déduit sa couleur de la catégorie du type', () => {
      renderDetail()
      const pastille = screen.getByTestId('opp-categorie')
      expect(pastille).toHaveClass('gj-cat')
      expect(pastille).toHaveClass('gj-cat--stage')
    })

    it('ne porte jamais le rouge — ce n’est pas une catégorie', () => {
      renderDetail()
      expect(screen.getByTestId('opp-categorie').className).not.toMatch(/red|urgent/)
    })
  })

  describe('pastille d’urgence', () => {
    it('est absente quand l’échéance est lointaine', () => {
      renderDetail()
      expect(screen.queryByTestId('opp-urgence')).not.toBeInTheDocument()
    })

    it('apparaît, séparée du type, quand l’échéance est proche', () => {
      renderDetail({ ...baseDetail, deadline: new Date(Date.now() + 2 * 86_400_000).toISOString() })
      const urgence = screen.getByTestId('opp-urgence')
      expect(urgence).toHaveClass('gj-urgent')
      expect(urgence).not.toBe(screen.getByTestId('opp-categorie'))
      expect(urgence.textContent).toMatch(/J-2/)
    })

    it('signale une offre close', () => {
      renderDetail({ ...baseDetail, deadline: new Date(Date.now() - 86_400_000).toISOString() })
      expect(screen.getByTestId('opp-urgence').textContent).toMatch(/CLÔTURÉE/i)
    })
  })
})
