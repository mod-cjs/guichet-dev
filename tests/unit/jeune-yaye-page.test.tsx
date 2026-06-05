import { act, fireEvent, render, screen } from '@testing-library/react'
import { YayeChat } from '@/app/jeune/yaye/YayeChat'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/jeune/yaye',
}))

// scrollIntoView n'est pas implémenté sous JSDOM.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

describe('<YayeChat /> — page Yaye fullscreen mobile (GUIC-194)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('rend le header + les messages mock initiaux + quick replies', () => {
    render(<YayeChat />)
    expect(screen.getByText('Yaye')).toBeInTheDocument()
    expect(screen.getByText('En ligne')).toBeInTheDocument()
    expect(screen.getByText(/Salama Awa/)).toBeInTheDocument()
    expect(screen.getByText('Yaye a agi pour toi')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Réponses suggérées/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Voir les 3 opportunités/i }),
    ).toBeInTheDocument()
  })

  it("envoie un message user depuis l'input et déclenche une réponse bot après 800ms", () => {
    render(<YayeChat />)
    const input = screen.getByLabelText('Message') as HTMLInputElement
    const submit = screen.getByRole('button', { name: 'Envoyer' })

    // Bouton désactivé tant qu'input vide.
    expect(submit).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Trouve-moi une formation' } })
    expect(submit).not.toBeDisabled()

    fireEvent.click(submit)

    // Message user visible immédiatement, input réinitialisé.
    expect(screen.getByText('Trouve-moi une formation')).toBeInTheDocument()
    expect(input.value).toBe('')

    // Indicateur typing présent.
    expect(screen.getByTestId('yaye-typing')).toBeInTheDocument()

    // Avance le timer simulé → la réponse bot apparaît.
    act(() => {
      jest.advanceTimersByTime(800)
    })
    expect(screen.queryByTestId('yaye-typing')).not.toBeInTheDocument()
    expect(screen.getByText(/formations courtes/i)).toBeInTheDocument()
  })

  it('click sur une QuickReply envoie immédiatement le message', () => {
    render(<YayeChat />)
    fireEvent.click(screen.getByRole('button', { name: /Affiner par localisation/i }))

    // Le texte apparaît à la fois dans la quick reply et dans le message user envoyé.
    expect(screen.getAllByText('Affiner par localisation').length).toBeGreaterThanOrEqual(2)
    act(() => {
      jest.advanceTimersByTime(800)
    })
    expect(screen.getByText(/Tambacounda/i)).toBeInTheDocument()
  })

  it("n'envoie rien sur soumission d'un input blanc", () => {
    render(<YayeChat />)
    const form = screen.getByLabelText('Envoyer un message à Yaye')
    fireEvent.submit(form)
    // Pas de typing indicator.
    expect(screen.queryByTestId('yaye-typing')).not.toBeInTheDocument()
  })
})
