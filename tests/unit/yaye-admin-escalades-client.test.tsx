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
const pushMock = jest.fn()
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: () => '/admin/yaye/escalades',
}))

const baseProps: EscaladesClientProps = {
  rows: [
    {
      id: 'e1',
      sessionId: 's1',
      cjsUid: 'u1',
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
      echeanceSla: new Date(Date.now() + 20 * 60_000).toISOString(),
      enRetardSla: false,
      resolutionNote: null,
      user: { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' },
    },
  ],
  counts: { en_attente: 1, prise_en_charge: 0, resolue: 0 },
  total: 1,
  currentPage: 1,
  totalPages: 1,
  centres: [{ id: 'c1', nom: 'CJS Dakar' }],
  filtres: { statut: '', canal: 'tous', centre: '', danger: false, retard: false, q: '', from: '', to: '' },
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

// ─── GUIC-259 — note de clôture à la résolution ────────────────────────────

it('cliquer « Marquer résolue » ouvre le modal de clôture sans envoyer le PATCH', () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  const priseEnCharge: EscaladesClientProps = {
    ...baseProps,
    rows: [{ ...baseProps.rows[0], statut: 'prise_en_charge' }],
  }
  render(<EscaladesClient {...priseEnCharge} />)

  fireEvent.click(screen.getByRole('button', { name: /Marquer résolue/i }))

  expect(screen.getByText(/Clôturer l'escalade/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/Note de clôture/i)).toBeInTheDocument()
  expect(global.fetch).not.toHaveBeenCalled()
})

it('après saisie de la note + Confirmer, envoie le PATCH avec statut=resolue et resolutionNote', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  const priseEnCharge: EscaladesClientProps = {
    ...baseProps,
    rows: [{ ...baseProps.rows[0], statut: 'prise_en_charge' }],
  }
  render(<EscaladesClient {...priseEnCharge} />)

  fireEvent.click(screen.getByRole('button', { name: /Marquer résolue/i }))
  fireEvent.change(screen.getByLabelText(/Note de clôture/i), {
    target: { value: 'Appelé la famille, situation apaisée.' },
  })
  fireEvent.click(screen.getByRole('button', { name: /Confirmer/i }))

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/yaye/escalades/e1',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
  const call = (global.fetch as jest.Mock).mock.calls[0]
  const body = JSON.parse(call[1].body)
  expect(body).toEqual({ statut: 'resolue', expectedFrom: 'prise_en_charge', resolutionNote: 'Appelé la famille, situation apaisée.' })
})

it('une escalade résolue avec resolutionNote affiche le texte de la note', () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  const resolueAvecNote: EscaladesClientProps = {
    ...baseProps,
    rows: [{ ...baseProps.rows[0], statut: 'resolue', resolutionNote: 'Dossier transmis au centre.' }],
  }
  render(<EscaladesClient {...resolueAvecNote} />)
  expect(screen.getByText(/Dossier transmis au centre\./i)).toBeInTheDocument()
})

it('les transitions non-résolue (prise en charge) restent inchangées : envoi direct, pas de modal', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)

  fireEvent.click(screen.getByRole('button', { name: /Prendre en charge/i }))

  expect(screen.queryByText(/Clôturer l'escalade/i)).not.toBeInTheDocument()
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/yaye/escalades/e1',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
  const call = (global.fetch as jest.Mock).mock.calls[0]
  const body = JSON.parse(call[1].body)
  expect(body).toEqual({ statut: 'prise_en_charge', expectedFrom: 'en_attente' })
})

it('GUIC-259 — « Rouvrir » demande confirmation (modal) avant de rouvrir', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  const resolue: EscaladesClientProps = { ...baseProps, rows: [{ ...baseProps.rows[0], statut: 'resolue' }] }
  render(<EscaladesClient {...resolue} />)

  fireEvent.click(screen.getByRole('button', { name: /Rouvrir/i }))
  expect(screen.getByText(/Rouvrir l'escalade \?/i)).toBeInTheDocument()
  expect(global.fetch).not.toHaveBeenCalled()

  // Deux boutons « Rouvrir » (ligne + confirmation modal) : on clique celui du modal (dernier).
  const boutons = screen.getAllByRole('button', { name: /^Rouvrir$/i })
  fireEvent.click(boutons[boutons.length - 1])
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
  expect(body).toEqual({ statut: 'en_attente', expectedFrom: 'resolue' })
})

it('GUIC-259 — succès affiche un toast de confirmation', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)
  fireEvent.click(screen.getByRole('button', { name: /Prendre en charge/i }))
  await waitFor(() => expect(screen.getByText(/prise en charge/i)).toBeInTheDocument())
})

it('GUIC-259 — 409 (conflit concurrent) → message dédié + rafraîchit', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 409 }) as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)
  fireEvent.click(screen.getByRole('button', { name: /Prendre en charge/i }))
  await waitFor(() => expect(screen.getByText(/a changé entre-temps/i)).toBeInTheDocument())
  expect(refreshMock).toHaveBeenCalled()
})

it('GUIC-259 — humanise le motif (jamais le code brut sujet_sensible)', () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)
  expect(screen.getByText('Sujet sensible')).toBeInTheDocument()
  expect(screen.queryByText('sujet_sensible')).not.toBeInTheDocument()
})

it('GUIC-259 — humanise le signal de danger (jamais automutilation_suicide brut)', () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  const danger: EscaladesClientProps = { ...baseProps, rows: [{ ...baseProps.rows[0], signalDanger: 'automutilation_suicide' }] }
  render(<EscaladesClient {...danger} />)
  expect(screen.getByText(/Automutilation \/ suicide/i)).toBeInTheDocument()
  expect(screen.queryByText(/automutilation_suicide/)).not.toBeInTheDocument()
})

it('GUIC-259 — la recherche (Entrée) navigue vers ?q=', () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)
  const input = screen.getByLabelText(/Rechercher une escalade/i)
  fireEvent.change(input, { target: { value: 'Diop' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('q=Diop'))
})

it('GUIC-259 — affiche l’échéance SLA restante sur une escalade non en retard (triage par urgence)', () => {
  render(<EscaladesClient {...baseProps} />)
  expect(screen.getByText(/échéance/i)).toBeInTheDocument()
})

it('GUIC-259 — pas d’échéance affichée sur une escalade résolue', () => {
  const props: EscaladesClientProps = {
    ...baseProps,
    rows: [{ ...baseProps.rows[0], statut: 'resolue' }],
  }
  render(<EscaladesClient {...props} />)
  expect(screen.queryByText(/échéance/i)).not.toBeInTheDocument()
})

it('GUIC-259 — un chip « En retard » navigue vers le filtre retard=1', () => {
  global.fetch = jest.fn() as unknown as typeof fetch
  render(<EscaladesClient {...baseProps} />)
  fireEvent.click(screen.getByRole('button', { name: /En retard/i }))
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('retard=1'))
})
