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
      canal: 'whatsapp',
      raison: 'sujet_sensible',
      stade: null,
      signalDanger: null,
      statut: 'en_attente',
      traitePar: null,
      traiteA: null,
      createdAt: new Date().toISOString(),
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
