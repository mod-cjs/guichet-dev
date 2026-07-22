/**
 * @jest-environment jsdom
 *
 * GUIC-554 — Composant client des préférences par canal (opt-in/opt-out).
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSet = jest.fn()
jest.mock('@/lib/notifications/preferences', () => ({
  setChannelPreference: (...a: unknown[]) => mockSet(...a),
}))

import { ChannelPreferencesClient } from '@/components/notifications/ChannelPreferencesClient'
import type { ChannelPreferenceView } from '@/lib/notifications/preferences'

const PREFS: ChannelPreferenceView[] = [
  { canal: 'in_app', consentGiven: true, enabled: true, requiresConsent: false },
  { canal: 'sms', consentGiven: false, enabled: true, requiresConsent: true },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockSet.mockResolvedValue({ ok: true })
})

describe('ChannelPreferencesClient', () => {
  it('in_app est marqué toujours actif, sans switch', () => {
    render(<ChannelPreferencesClient initial={PREFS} />)
    expect(screen.getByText(/toujours actif/i)).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /application/i })).not.toBeInTheDocument()
  })

  it('activer le SMS appelle setChannelPreference avec consentGiven=true', async () => {
    render(<ChannelPreferencesClient initial={PREFS} />)
    await userEvent.click(screen.getByRole('switch', { name: /Recevoir par SMS/i }))
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith('sms', { consentGiven: true, enabled: true }),
    )
  })
})
