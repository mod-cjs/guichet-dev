/** @jest-environment jsdom */
/**
 * GUIC-522 — Cluster A : comptoir en LECTURE SEULE côté admin (F-01→F-05).
 * L'admin SUPERVISE les emprunts (en cours / en retard / réservés) mais ne fait
 * NI retrait NI retour — réservés au staff/conseiller via scan QR au centre.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { AdminBiblioEmpruntsClient } from '@/app/admin/bibliotheque/gestion/AdminBiblioEmpruntsClient'
import type { EmpruntVue } from '@/lib/bibliotheque/service'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))

function emprunt(over: Partial<EmpruntVue> = {}): EmpruntVue {
  return {
    id: 'e1',
    statut: 'en_cours',
    livre: { id: 'l1', titre: 'Le Petit Prince', auteur: 'Saint-Exupéry' },
    exemplaire: {
      id: 'ex1', codeBarre: 'CB-1', centreId: 'c1', centreNom: 'Centre A',
      rayon: 'A', etagere: 'B', position: '1',
    },
    initieA: '2026-06-01T00:00:00.000Z',
    confirmeA: '2026-06-02T00:00:00.000Z',
    dateRetourPrevue: '2026-06-16T00:00:00.000Z',
    renduA: null,
    confirmePar: 'staff-1',
    emprunteur: { nom: 'Diop', prenom: 'Awa' },
    ...over,
  }
}

describe('AdminBiblioEmpruntsClient — comptoir lecture seule', () => {
  it('n’affiche AUCUN bouton Confirmer ni Enregistrer le retour', () => {
    render(
      <AdminBiblioEmpruntsClient
        centreId="c1"
        enCours={[emprunt()]}
        enRetard={[emprunt({ id: 'e2', statut: 'en_retard' })]}
        reserves={[emprunt({ id: 'e3', statut: 'initie' })]}
      />,
    )
    expect(screen.queryByRole('button', { name: /confirmer/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enregistrer le retour/i })).not.toBeInTheDocument()
  })

  it('empty states en langage de supervision (pas « tous traités »)', () => {
    render(<AdminBiblioEmpruntsClient centreId="c1" enCours={[]} enRetard={[]} reserves={[]} />)
    expect(screen.getByText(/aucun emprunt en cours/i)).toBeInTheDocument()
    expect(screen.queryByText(/tous traités/i)).not.toBeInTheDocument()
  })

  it('affiche l’emprunteur (nom + prénom) en info de supervision', () => {
    render(<AdminBiblioEmpruntsClient centreId="c1" enCours={[emprunt()]} enRetard={[]} reserves={[]} />)
    expect(screen.getByText(/Awa Diop|Diop Awa/)).toBeInTheDocument()
  })
})

describe('GUIC-522 F-03 — routes comptoir confirmer/retour admin supprimées', () => {
  const root = path.resolve(__dirname, '..', '..')

  it('le dossier de route confirmer a été supprimé', () => {
    expect(existsSync(path.join(root, 'src/app/api/admin/bibliotheque/emprunts/[id]/confirmer'))).toBe(false)
  })

  it('le dossier de route retour a été supprimé', () => {
    expect(existsSync(path.join(root, 'src/app/api/admin/bibliotheque/emprunts/[id]/retour'))).toBe(false)
  })
})
