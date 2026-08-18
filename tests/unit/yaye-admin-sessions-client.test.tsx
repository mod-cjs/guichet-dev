/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — SessionsClient (GUIC-259, R-3/R-4).
 * - Le centre doit être affiché par son NOM, jamais le cuid technique brut.
 * - L'en-tête « Intention » est renommé « Outil principal » (honnête vis-à-vis
 *   de la donnée : c'est le premier outil appelé, pas une intention détectée).
 */
import { render, screen } from '@testing-library/react'
import { SessionsClient, type SessionsClientProps } from '@/app/admin/yaye/sessions/SessionsClient'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/admin/yaye/sessions',
}))

const baseProps: SessionsClientProps = {
  rows: [
    {
      sessionId: 's1',
      canal: 'web',
      cjsUid: 'u1',
      role: 'beneficiaire',
      centreId: 'c1',
      centreNom: 'CJS Dakar',
      debut: new Date('2026-06-01T10:00:00Z').toISOString(),
      dureeMs: 5000,
      nbTours: 3,
      nbEvents: 9,
      outilPrincipal: 'search_opportunities',
      hasErreur: false,
      hasEscalade: false,
      user: { prenom: 'Awa', nom: 'Diop' },
      yqs: 80,
      drapeauRouge: false,
      resolu: true,
      converti: false,
      feedback: 0,
    },
    {
      sessionId: 's2',
      canal: 'web',
      cjsUid: 'u2',
      role: 'beneficiaire',
      centreId: 'c-inconnu',
      centreNom: null,
      debut: new Date('2026-06-02T10:00:00Z').toISOString(),
      dureeMs: 2000,
      nbTours: 1,
      nbEvents: 2,
      outilPrincipal: null,
      hasErreur: false,
      hasEscalade: false,
      user: null,
      yqs: null,
      drapeauRouge: false,
      resolu: false,
      converti: false,
      feedback: 0,
    },
  ],
  summary: { sessions: 2, escalades: 0, erreurs: 0 },
  total: 2,
  currentPage: 1,
  totalPages: 1,
  centres: [{ id: 'c1', nom: 'CJS Dakar' }],
  roles: ['beneficiaire'],
  filtres: { from: '2026-06-01', to: '2026-06-30', canal: 'tous', q: '', filtre: '', role: '', centre: '' },
}

it('affiche le NOM du centre, jamais le cuid technique brut', () => {
  render(<SessionsClient {...baseProps} />)
  expect(screen.getByText(/CJS Dakar/)).toBeInTheDocument()
  expect(screen.queryByText(/c1/)).not.toBeInTheDocument()
  expect(screen.queryByText(/c-inconnu/)).not.toBeInTheDocument()
})

it("l'en-tête dit « Outil principal » (pas « Intention »)", () => {
  render(<SessionsClient {...baseProps} />)
  expect(screen.getByText('Outil principal')).toBeInTheDocument()
  expect(screen.queryByText(/^Intention$/)).not.toBeInTheDocument()
})
