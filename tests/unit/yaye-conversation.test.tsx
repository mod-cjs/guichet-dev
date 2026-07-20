import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { YayeConversation } from '@/components/yaye/YayeConversation'

// YayeBlocks (rendu dans les bulles bot) appelle useRouter.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/jeune/yaye',
}))

// scrollIntoView n'est pas implémenté sous JSDOM (auto-scroll du drawer).
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

const mockFetch = jest.fn()

// Route par méthode : GET au montage (restauration d'historique) vs POST à l'envoi
// (streamYaye). Sans ça, le GET de montage consommerait la réponse prévue pour le POST.
function historyResponse(turns: unknown[] = []) {
  return { ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: { turns } }) }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation((_url: unknown, opts: { method?: string } = {}) =>
    Promise.resolve(opts.method === 'POST'
      ? { ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: {} }) }
      : historyResponse()),
  )
  global.fetch = mockFetch as unknown as typeof fetch
})

function replyOnce(data: Record<string, unknown>) {
  mockFetch.mockImplementation((_url: unknown, opts: { method?: string } = {}) =>
    Promise.resolve(opts.method === 'POST'
      ? { ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data }) }
      : historyResponse()),
  )
}

describe('<YayeConversation /> — feedback par tour (parité fullscreen)', () => {
  it('affiche les boutons de feedback 👍/👎 sous la réponse quand un sessionId est renvoyé', async () => {
    replyOnce({ reply: 'Voici ce que j’ai trouvé.', sessionId: 'sess-1', blocks: [{ kind: 'text', text: 'Voici ce que j’ai trouvé.' }] })

    render(<YayeConversation open onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText(/Message à Yaye/i), { target: { value: 'un stage à Thiès' } })
    fireEvent.click(screen.getByRole('button', { name: /^Envoyer$/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Réponse utile/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Réponse pas utile/i })).toBeInTheDocument()
    })
  })

  it('n’affiche pas le feedback si l’agent ne renvoie pas de sessionId', async () => {
    replyOnce({ reply: 'Réponse sans session active.', blocks: [{ kind: 'text', text: 'Réponse sans session active.' }] })

    render(<YayeConversation open onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText(/Message à Yaye/i), { target: { value: 'salut' } })
    fireEvent.click(screen.getByRole('button', { name: /^Envoyer$/i }))

    // La réponse apparaît dans la bulle ET dans la région live SR (annonce a11y) → ≥1 nœud.
    await waitFor(() => expect(screen.getAllByText(/Réponse sans session active\./).length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: /Réponse utile/i })).not.toBeInTheDocument()
  })
})
