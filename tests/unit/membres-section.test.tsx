/**
 * GUIC-706 (Phase 2b) — section « Membres (0..N) » de la fiche partenaire.
 * Remplace l'ancienne section « Compte recruteur » (1:1). Liste rôle/statut, bouton
 * Rattacher, action Révoquer/Réactiver par membre. Actions déléguées (mockées).
 */
import { render, screen } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('@/app/admin/partenaires/actions', () => ({
  changerStatutMembre: jest.fn().mockResolvedValue({ ok: true }),
  rattacherMembre: jest.fn().mockResolvedValue({ id: 'm9' }),
  rechercherUtilisateurs: jest.fn().mockResolvedValue([]),
}))

import { MembresSection } from '@/app/admin/partenaires/[id]/MembresSection'

const MEMBRES = [
  { id: 'm1', cjsUid: 'u1', nom: 'Awa Diop', contact: 'awa@ex.sn', role: 'titulaire' as const, statut: 'actif' as const, personneStatut: 'actif' },
  { id: 'm2', cjsUid: 'u2', nom: 'Bou Sow', contact: 'bou@ex.sn', role: 'recruteur' as const, statut: 'revoke' as const, personneStatut: 'actif' },
]

describe('GUIC-706 — MembresSection', () => {
  it('liste les membres avec nom, rôle et statut', () => {
    render(<MembresSection organisationId="org1" membres={MEMBRES} />)
    expect(screen.getByText('Awa Diop')).toBeInTheDocument()
    expect(screen.getByText('Bou Sow')).toBeInTheDocument()
    expect(screen.getByText(/Titulaire/i)).toBeInTheDocument()
    expect(screen.getByText(/Révoqué/i)).toBeInTheDocument() // membre m2 statut revoke
  })

  it('propose « Rattacher un membre »', () => {
    render(<MembresSection organisationId="org1" membres={MEMBRES} />)
    expect(screen.getByRole('button', { name: /Rattacher un membre/i })).toBeInTheDocument()
  })

  it('offre Révoquer sur un membre actif et Réactiver sur un membre révoqué', () => {
    render(<MembresSection organisationId="org1" membres={MEMBRES} />)
    expect(screen.getByRole('button', { name: /^Révoquer$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Réactiver$/i })).toBeInTheDocument()
  })

  it('état vide → message + bouton Rattacher', () => {
    render(<MembresSection organisationId="org1" membres={[]} />)
    expect(screen.getByText(/Aucun membre/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rattacher un membre/i })).toBeInTheDocument()
  })
})
