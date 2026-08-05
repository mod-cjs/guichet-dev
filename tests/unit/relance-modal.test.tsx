/**
 * GUIC-692 (PR-C) — RelanceModal : destinataire (Recruteur/Candidat/Les deux) + canaux
 * multi (in-app/e-mail libres, WhatsApp/SMS par template) + message → action de relance.
 * TDD — RED d'abord.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockRelancer = jest.fn().mockResolvedValue({ envoyees: 1, ignorees: 0 })
jest.mock('@/app/admin/candidatures/actions', () => ({ relancerCandidatures: (...a: unknown[]) => mockRelancer(...a) }))

import { RelanceModal } from '@/app/admin/candidatures/RelanceModal'

beforeEach(() => mockRelancer.mockClear())

describe('GUIC-692 — RelanceModal', () => {
  it('propose destinataire, canaux et message', () => {
    render(<RelanceModal ids={['c1']} onClose={() => {}} />)
    expect(screen.getByLabelText(/Destinataire/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Canaux/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Message/i)).toBeInTheDocument()
  })

  it('envoi : appelle relancerCandidatures avec ids + destinataire + canaux + message', async () => {
    render(<RelanceModal ids={['c1', 'c2']} onClose={() => {}} />)
    // in-app est coché par défaut ; on ajoute e-mail
    fireEvent.click(screen.getByRole('button', { name: /^E-mail$/i }))
    fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Merci de traiter' } })
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la relance/i }))
    await waitFor(() => expect(mockRelancer).toHaveBeenCalledTimes(1))
    const [ids, opts] = mockRelancer.mock.calls[0]
    expect(ids).toEqual(['c1', 'c2'])
    expect(opts.message).toBe('Merci de traiter')
    expect(opts.canaux).toEqual(expect.arrayContaining(['in_app', 'email']))
  })

  it('note que WhatsApp/SMS partent par template', () => {
    render(<RelanceModal ids={['c1']} onClose={() => {}} />)
    expect(screen.getByText(/template/i)).toBeInTheDocument()
  })
})
