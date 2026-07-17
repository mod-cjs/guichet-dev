import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { YayeChat } from '@/app/jeune/yaye/YayeChat'
import { routeYayeFetch, yayePostCalls } from './_helpers/yaye-fetch'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/jeune/yaye',
}))

// scrollIntoView n'est pas implémenté sous JSDOM.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

const mockFetch = jest.fn()
let randomSpy: jest.SpyInstance

/** Cf. `_helpers/yaye-fetch` : le mock est routé par méthode (GET historique / POST message). */
const postCalls = () => yayePostCalls(mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
  routeYayeFetch(mockFetch)
  // Greeting + amorces varient par Math.random ; on fige sur la variante canonique
  // (« Bonjour … » + « Une offre pour moi ») pour des assertions déterministes.
  randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)
})
afterEach(() => {
  randomSpy.mockRestore()
})

function replyOnce(reply: string) {
  routeYayeFetch(mockFetch, {
    reply: {
      reply,
      blocks:    [{ kind: 'text', text: reply }],
      sessionId: '11111111-1111-1111-1111-111111111111',
    },
  })
}

describe('<YayeChat /> — page mobile branchée sur /api/ia', () => {
  it("rend le header, l'intro (sans pourcentage) et les suggestions", () => {
    render(<YayeChat />)
    expect(screen.getByText('Yaye')).toBeInTheDocument()
    expect(screen.getByText('Conseillère IA')).toBeInTheDocument()
    expect(screen.getByText(/Bonjour/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Une offre pour moi/i })).toBeInTheDocument()
    // Aucune mention de pourcentage de compatibilité dans l'écran initial.
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("envoie un message et affiche la réponse de l'agent", async () => {
    replyOnce('Voici une formation près de chez toi.')
    render(<YayeChat />)
    const input = screen.getByLabelText('Message') as HTMLInputElement
    const submit = screen.getByRole('button', { name: 'Envoyer' })

    expect(submit).toBeDisabled()
    fireEvent.change(input, { target: { value: 'Je cherche une formation' } })
    expect(submit).not.toBeDisabled()

    fireEvent.click(submit)
    expect(screen.getByText('Je cherche une formation')).toBeInTheDocument()
    expect(input.value).toBe('')

    // La réponse apparaît dans la bulle visible ET dans la région live SR (a11y) → ≥1.
    await waitFor(() =>
      expect(screen.getAllByText('Voici une formation près de chez toi.').length).toBeGreaterThan(0),
    )
    expect(mockFetch).toHaveBeenCalledWith('/api/ia', expect.objectContaining({ method: 'POST' }))
    expect(postCalls()).toHaveLength(1)
  })

  it('une QuickReply envoie immédiatement le message', async () => {
    replyOnce('Je regarde tes candidatures.')
    render(<YayeChat />)
    fireEvent.click(screen.getByRole('button', { name: /Mes candidatures/i }))
    await waitFor(() => expect(screen.getAllByText('Je regarde tes candidatures.').length).toBeGreaterThan(0))
  })

  it("n'envoie rien sur soumission d'un input blanc", () => {
    render(<YayeChat />)
    fireEvent.submit(screen.getByLabelText('Envoyer un message à Yaye'))
    // GUIC-617 — l'intention est « aucun MESSAGE envoyé », pas « aucun fetch » : le montage fait
    // un GET /api/ia légitime (historique, GUIC-540). L'ancienne assertion `not.toHaveBeenCalled()`
    // décrivait le composant d'avant cette fonctionnalité.
    expect(postCalls()).toHaveLength(0)
  })
})
