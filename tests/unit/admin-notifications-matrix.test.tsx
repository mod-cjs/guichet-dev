/**
 * @jest-environment jsdom
 *
 * GUIC-550 — Matrice admin (composant client) : rendu + toggle → action.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSet = jest.fn()
jest.mock('@/app/admin/notifications/actions', () => ({
  setEventChannels: (...a: unknown[]) => mockSet(...a),
}))

import { AdminNotificationsMatrix } from '@/app/admin/notifications/AdminNotificationsMatrix'
import type { MatrixCell } from '@/lib/notifications/matrix'

const CELLS: MatrixCell[] = [
  {
    eventKey: 'candidature.statut_change',
    label: 'Statut de candidature mis à jour',
    module: 'm3',
    role: 'beneficiaire',
    critical: true,
    canaux: ['in_app'],
    isOverride: false,
    actif: true,
    mode: 'auto',
    delaiMinutes: null,
  },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockSet.mockResolvedValue({ ok: true })
})

describe('AdminNotificationsMatrix', () => {
  it('rend un switch par canal avec l’état coché correct', () => {
    render(<AdminNotificationsMatrix initial={CELLS} />)
    const inApp = screen.getByRole('switch', { name: /^App —/ })
    const sms = screen.getByRole('switch', { name: /^SMS —/ })
    expect(inApp).toHaveAttribute('aria-checked', 'true')
    expect(sms).toHaveAttribute('aria-checked', 'false')
  })

  it('activer un canal appelle setEventChannels avec le canal ajouté', async () => {
    render(<AdminNotificationsMatrix initial={CELLS} />)
    await userEvent.click(screen.getByRole('switch', { name: /^SMS —/ }))
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith(
        'candidature.statut_change',
        'beneficiaire',
        ['in_app', 'sms'],
        true,
        'auto',
        null,
      ),
    )
  })

  it('changer le mode en Validation appelle setEventChannels avec mode=validation', async () => {
    render(<AdminNotificationsMatrix initial={CELLS} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Validation' }))
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith(
        'candidature.statut_change',
        'beneficiaire',
        ['in_app'],
        true,
        'validation',
        null,
      ),
    )
  })

  it('le mode Différé affiche le champ délai en minutes', async () => {
    render(<AdminNotificationsMatrix initial={[{ ...CELLS[0], mode: 'differe', delaiMinutes: 120 }]} />)
    expect(screen.getByLabelText(/Délai en minutes/)).toHaveValue(120)
  })

  it('refuse de couper l’in-app d’un événement critique', async () => {
    render(<AdminNotificationsMatrix initial={CELLS} />)
    await userEvent.click(screen.getByRole('switch', { name: /^App —/ }))
    expect(mockSet).not.toHaveBeenCalled()
  })

  // Régression GUIC-550 : la matrice était en text-white sur le fond CLAIR du layout admin.
  it('reste lisible sur fond clair (design v4) : pas de blanc sans fond coloré, libellés visibles', () => {
    const { container } = render(<AdminNotificationsMatrix initial={CELLS} />)
    // text-white admis uniquement sur un élément qui pose son propre fond (ex. segment actif teal).
    for (const el of container.querySelectorAll('[class*="text-white"]')) {
      expect(el.className).toMatch(/bg-/)
    }
    expect(screen.getByText('Statut de candidature mis à jour')).toBeInTheDocument()
    expect(screen.getByText('Bénéficiaire')).toBeInTheDocument() // pill du rôle
    expect(screen.getByText('WhatsApp')).toBeInTheDocument() // libellé sous le toggle
  })
})
