import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { YayeChat } from '@/app/jeune/yaye/YayeChat'

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
beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
  // Greeting + amorces varient par Math.random ; on fige sur la variante canonique
  // (« Bonjour … » + « Une offre pour moi ») pour des assertions déterministes.
  randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)
})
afterEach(() => {
  randomSpy.mockRestore()
})

function replyOnce(reply: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      data: { reply, blocks: [{ kind: 'text', text: reply }], sessionId: '11111111-1111-1111-1111-111111111111' },
    }),
  })
}

describe('<YayeChat /> — page mobile branchée sur /api/ia', () => {
  it("rend le header, l'intro (sans pourcentage) et les suggestions", () => {
    render(<YayeChat />)
    expect(screen.getByText('Yaye')).toBeInTheDocument()
    expect(screen.getByText('En ligne')).toBeInTheDocument()
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

    await waitFor(() =>
      expect(screen.getByText('Voici une formation près de chez toi.')).toBeInTheDocument(),
    )
    expect(mockFetch).toHaveBeenCalledWith('/api/ia', expect.objectContaining({ method: 'POST' }))
  })

  it('une QuickReply envoie immédiatement le message', async () => {
    replyOnce('Je regarde tes candidatures.')
    render(<YayeChat />)
    fireEvent.click(screen.getByRole('button', { name: /Mes candidatures/i }))
    await waitFor(() => expect(screen.getByText('Je regarde tes candidatures.')).toBeInTheDocument())
  })

  it("n'envoie rien sur soumission d'un input blanc", () => {
    render(<YayeChat />)
    fireEvent.submit(screen.getByLabelText('Envoyer un message à Yaye'))
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
