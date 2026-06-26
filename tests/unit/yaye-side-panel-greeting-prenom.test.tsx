/**
 * @jest-environment jsdom
 *
 * L2-F-03 — Greeting Yaye codé en dur « Salama Awa »
 * Vérifie que :
 * - Avec prop prenom="Fatou", le greeting contient "Salama Fatou"
 * - Sans prop prenom (ou prenom vide), le greeting générique est affiché
 *   (pas de nom codé en dur comme "Awa")
 */
import { render, screen } from '@testing-library/react'
import { YayeSidePanel } from '@/components/ui/Yaye/YayeSidePanel'

// scrollIntoView n'est pas implémenté sous JSDOM (auto-scroll du drawer).
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

describe('<YayeSidePanel /> — L2-F-03 greeting personnalisé', () => {
  it('affiche le prénom passé dans le greeting par défaut', () => {
    render(<YayeSidePanel open onClose={() => {}} prenom="Fatou" />)
    expect(screen.getByText(/Salama Fatou/i)).toBeInTheDocument()
  })

  it('affiche un greeting générique sans nom quand prenom est absent', () => {
    render(<YayeSidePanel open onClose={() => {}} />)
    // Ne doit pas contenir "Awa" (le nom démo codé en dur)
    expect(screen.queryByText(/Awa/i)).not.toBeInTheDocument()
  })

  it('affiche un greeting générique sans nom quand prenom est chaîne vide', () => {
    render(<YayeSidePanel open onClose={() => {}} prenom="" />)
    expect(screen.queryByText(/Awa/i)).not.toBeInTheDocument()
  })

  it('le greeting générique contient quand même le message de présentation', () => {
    render(<YayeSidePanel open onClose={() => {}} />)
    // Le message doit toujours présenter les opportunités
    expect(screen.getByText(/opportunité/i)).toBeInTheDocument()
  })
})
