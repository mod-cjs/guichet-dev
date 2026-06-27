import { render, screen, act } from '@testing-library/react'
import { toolStatus } from '@/lib/ia/tool-labels'
import { YayeTypingIndicator } from '@/components/ui/Yaye/YayeTypingIndicator'
import { YayeSkeletonCards } from '@/components/ui/Yaye/YayeSkeletonCards'
import { YayeStreamingText } from '@/components/yaye/YayeStreamingText'

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

describe('tool-labels', () => {
  it('mappe un outil de recherche → libellé + searching', () => {
    expect(toolStatus('search_opportunities')).toEqual({ label: 'Yaye cherche des opportunités', searching: true })
    expect(toolStatus('query_knowledge_graph').searching).toBe(true)
  })
  it('outil non-recherche → pas de searching', () => {
    expect(toolStatus('get_badge').searching).toBeFalsy()
  })
  it('outil inconnu → fallback générique', () => {
    expect(toolStatus('n_importe_quoi').label).toMatch(/réfléchit/i)
  })
})

describe('<YayeTypingIndicator />', () => {
  it('affiche le libellé contextuel quand fourni', () => {
    render(<YayeTypingIndicator label="Yaye cherche des opportunités" />)
    expect(screen.getByText(/Yaye cherche des opportunités/)).toBeInTheDocument()
  })
  it('sans libellé : juste l’indicateur animé', () => {
    render(<YayeTypingIndicator />)
    expect(screen.getByTestId('yaye-typing')).toBeInTheDocument()
  })
})

describe('<YayeSkeletonCards />', () => {
  it('rend des placeholders', () => {
    render(<YayeSkeletonCards />)
    expect(screen.getByTestId('yaye-skeleton')).toBeInTheDocument()
  })
})

describe('<YayeStreamingText />', () => {
  it('révèle le texte progressivement (cadence lissée)', () => {
    jest.useFakeTimers()
    try {
      render(<YayeStreamingText text="Bonjour Bineta" />)
      // Avant l'animation, rien (ou presque) n'est révélé.
      act(() => { jest.advanceTimersByTime(1000) })
      expect(screen.getByTestId('yaye-streaming')).toHaveTextContent('Bonjour Bineta')
    } finally {
      jest.useRealTimers()
    }
  })
})
