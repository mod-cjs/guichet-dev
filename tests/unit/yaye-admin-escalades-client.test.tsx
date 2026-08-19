/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — file d'escalade, EscaladesClient (GUIC-259, R-2).
 * Un PATCH qui échoue (403/404/500/réseau) doit afficher un message d'erreur
 * explicite au lieu de laisser l'opérateur croire, en silence, que l'action a réussi.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EscaladesClient, type EscaladesClientProps } from '@/app/admin/yaye/escalades/EscaladesClient'

const refreshMock = jest.fn()
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
  usePathname: () => '/admin/yaye/escalades',
}))

const baseProps: EscaladesClientProps = {
  rows: [
    {
      id: 'e1',
      sessionId: 's1',
      cjsUid: 'u1',
      role: 'beneficiaire',
      centreId: 'c1',
      centreNom: 'CJS Dakar',
      canal: 'whatsapp',
      raison: 'sujet_sensible',
      stade: null,
      signalDanger: null,
      priorite: 1,
      statut: 'en_attente',
      traitePar: null,
      traiteA: null,
      createdAt: new Date().toISOString(),
      enRetardSla: false,
      user: { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' },
    },
  ],
  counts: { en_attente: 1, prise_en_charge: 0, resolue: 0 },
  total: 1,
  currentPage: 1,
  totalPages: 1,
  centres: [{ id: 'c1', nom: 'CJS Dakar' }],
  filtres: { statut: '', canal: 'tous', centre: '', danger: false },
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('affiche un message d\'erreur explicite quand le PATCH échoue (res.ok=false) — pas de refresh silencieux', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)

  fireEvent.click(screen.getByRole('button', { name: /Prendre en charge/i }))

  await waitFor(() => {
    expect(screen.getByText(/Action impossible/i)).toBeInTheDocument()
  })
  expect(refreshMock).not.toHaveBeenCalled()
})

it("affiche un message d'erreur explicite quand le fetch lève une exception réseau", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)

  fireEvent.click(screen.getByRole('button', { name: /Prendre en charge/i }))

  await waitFor(() => {
    expect(screen.getByText(/Action impossible/i)).toBeInTheDocument()
  })
  expect(refreshMock).not.toHaveBeenCalled()
})

it('ne montre aucune erreur et rafraîchit quand le PATCH réussit', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)

  fireEvent.click(screen.getByRole('button', { name: /Prendre en charge/i }))

  await waitFor(() => {
    expect(refreshMock).toHaveBeenCalled()
  })
  expect(screen.queryByText(/Action impossible/i)).not.toBeInTheDocument()
})

it('affiche le NOM du centre, jamais le cuid technique brut (R-3)', () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)
  expect(screen.getAllByText(/CJS Dakar/).length).toBeGreaterThanOrEqual(1)
  expect(screen.queryByText('c1')).not.toBeInTheDocument()
})

it('affiche un badge de priorité (en plus du badge Danger, mineur)', () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)
  expect(screen.getByText(/Priorité 1/i)).toBeInTheDocument()
})

it('GUIC-259 Phase 1 — badge « SLA dépassé » sur une escalade en retard non résolue', () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  const enRetard: EscaladesClientProps = {
    ...baseProps,
    rows: [{ ...baseProps.rows[0], enRetardSla: true, statut: 'en_attente' }],
  }
  render(<EscaladesClient {...enRetard} />)
  expect(screen.getByText(/SLA dépassé/i)).toBeInTheDocument()
})

it('GUIC-259 — pas de badge SLA si l’escalade est résolue', () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  const resolue: EscaladesClientProps = {
    ...baseProps,
    rows: [{ ...baseProps.rows[0], enRetardSla: true, statut: 'resolue' }],
  }
  render(<EscaladesClient {...resolue} />)
  expect(screen.queryByText(/SLA dépassé/i)).not.toBeInTheDocument()
})
