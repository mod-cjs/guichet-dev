/** @jest-environment jsdom */
/** GUIC-687 — modal ressource : type segmenté + formulaire ADAPTATIF au type. */
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/app/admin/centres/ressources-actions', () => ({
  creerRessourceCentre: jest.fn().mockResolvedValue({ id: 'x' }),
  modifierRessourceCentre: jest.fn().mockResolvedValue({ ok: true }),
}))
// RichTextEditor tire tiptap (lourd) — on le neutralise pour ce test.
jest.mock('@/components/ui/RichTextEditor', () => ({ RichTextEditor: () => null }))

import { RessourceCentreFormModal } from '@/app/admin/centres/RessourceCentreFormModal'

describe('RessourceCentreFormModal (adaptatif au type)', () => {
  it('affiche les types en boutons segmentés', () => {
    render(<RessourceCentreFormModal isOpen onClose={() => {}} centreId="c1" />)
    const grp = screen.getByRole('group', { name: /type de ressource/i })
    expect(grp).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Véhicule' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atelier récurrent' })).toBeInTheDocument()
  })

  it('le label de capacité + l’unité s’adaptent au type choisi', () => {
    render(<RessourceCentreFormModal isOpen onClose={() => {}} centreId="c1" />)
    // Salle par défaut
    expect(screen.getByLabelText(/Capacité \(personnes\)/i)).toBeInTheDocument()
    expect((screen.getByLabelText(/^Unité$/i) as HTMLInputElement).value).toBe('personnes')
    // Bascule vers Véhicule
    fireEvent.click(screen.getByRole('button', { name: 'Véhicule' }))
    expect(screen.getByLabelText(/Places assises/i)).toBeInTheDocument()
    expect((screen.getByLabelText(/^Unité$/i) as HTMLInputElement).value).toBe('places')
    // Poste info
    fireEvent.click(screen.getByRole('button', { name: 'Poste info' }))
    expect(screen.getByLabelText(/Nombre de postes/i)).toBeInTheDocument()
  })

  it('CTA « Créer la ressource » en création', () => {
    render(<RessourceCentreFormModal isOpen onClose={() => {}} centreId="c1" />)
    expect(screen.getByRole('button', { name: /Créer la ressource/i })).toBeInTheDocument()
  })
})
