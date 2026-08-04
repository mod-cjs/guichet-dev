/**
 * GUIC-701 (PR-C) — MessageGroupeModal : message aux utilisateurs sélectionnés (in-app +
 * e-mail, réutilise le moteur de notifs). TDD — RED.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockMsg = jest.fn().mockResolvedValue({ envoyes: 2, ignores: 0 })
jest.mock('@/app/admin/utilisateurs/actions', () => ({ messageGroupe: (...a: unknown[]) => mockMsg(...a) }))

import { MessageGroupeModal } from '@/app/admin/utilisateurs/MessageGroupeModal'

beforeEach(() => mockMsg.mockClear())

describe('GUIC-701 — MessageGroupeModal', () => {
  it('propose canaux (in-app/e-mail), objet et message', () => {
    render(<MessageGroupeModal cjsUids={['u1', 'u2']} onClose={() => {}} />)
    expect(screen.getByRole('group', { name: /Canaux/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Objet')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
  })

  it('envoi → messageGroupe(ids, {canaux, objet, message})', async () => {
    render(<MessageGroupeModal cjsUids={['u1', 'u2']} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^E-mail$/i }))
    fireEvent.change(screen.getByLabelText('Objet'), { target: { value: 'Info' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Bonjour à tous' } })
    fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }))
    await waitFor(() => expect(mockMsg).toHaveBeenCalledTimes(1))
    const [ids, opts] = mockMsg.mock.calls[0]
    expect(ids).toEqual(['u1', 'u2'])
    expect(opts.message).toBe('Bonjour à tous')
    expect(opts.canaux).toEqual(expect.arrayContaining(['in_app', 'email']))
  })
})
