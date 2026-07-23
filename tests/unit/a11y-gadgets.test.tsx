import { render, fireEvent, cleanup } from '@testing-library/react'
import { A11yProvider, A11Y_DEFAULTS } from '@/components/a11y/A11yProvider'
import { A11yGadgets } from '@/components/a11y/A11yGadgets'
import type { A11yPrefs } from '@/components/a11y/A11yProvider'

/** Monte les gadgets sous un provider initialisé avec `prefs`. */
function renderGadgets(prefs: Partial<A11yPrefs> = {}) {
  return render(
    <A11yProvider initial={{ ...A11Y_DEFAULTS, ...prefs }}>
      <A11yGadgets />
      <p>Bonjour le Guichet</p>
    </A11yProvider>,
  )
}

type SpeechMock = { speak: jest.Mock; cancel: jest.Mock }

function mockSpeech(): SpeechMock {
  const mock = { speak: jest.fn(), cancel: jest.fn() }
  Object.defineProperty(window, 'speechSynthesis', {
    value: mock,
    configurable: true,
  })
  // Le constructeur n'existe pas dans jsdom — stub minimal porteur de texte/lang.
  ;(
    window as unknown as { SpeechSynthesisUtterance: unknown }
  ).SpeechSynthesisUtterance = function (this: { text: string }, text: string) {
    this.text = text
  }
  return mock
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  for (const a of ['data-guide', 'data-voice', 'data-cursor']) {
    document.documentElement.removeAttribute(a)
  }
  delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
})

describe('<A11yGadgets />', () => {
  it('ne rend rien quand guide et voice sont désactivés', () => {
    renderGadgets()
    expect(document.getElementById('gj-a11y-guide')).toBeNull()
  })

  it('guide actif → barre #gj-a11y-guide rendue et suivant la souris', () => {
    renderGadgets({ guide: true })
    const bar = document.getElementById('gj-a11y-guide')
    expect(bar).not.toBeNull()
    fireEvent.mouseMove(document, { clientY: 300 })
    expect(bar!.style.top).toBe('281px') // clientY - hauteur/2 (38/2 = 19)
  })

  it('voice actif → un clic sur un paragraphe lit son texte en fr-FR', () => {
    const speech = mockSpeech()
    const { getByText } = renderGadgets({ voice: true })
    speech.speak.mockClear() // ignorer l'éventuelle annonce d'activation
    speech.cancel.mockClear()
    fireEvent.click(getByText('Bonjour le Guichet'))
    expect(speech.cancel).toHaveBeenCalled()
    expect(speech.speak).toHaveBeenCalledTimes(1)
    const utterance = speech.speak.mock.calls[0][0] as { text: string; lang: string }
    expect(utterance.text).toContain('Bonjour le Guichet')
    expect(utterance.lang).toBe('fr-FR')
  })

  it('voice inactif → aucun speak au clic', () => {
    const speech = mockSpeech()
    const { getByText } = renderGadgets()
    fireEvent.click(getByText('Bonjour le Guichet'))
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('environnement sans speechSynthesis → aucun throw au clic', () => {
    const { getByText } = renderGadgets({ voice: true })
    expect(() => fireEvent.click(getByText('Bonjour le Guichet'))).not.toThrow()
  })

  it('voice actif → clic sur une zone non lisible (div nu) → silence', () => {
    const speech = mockSpeech()
    const { container } = render(
      <A11yProvider initial={{ ...A11Y_DEFAULTS, voice: true }}>
        <A11yGadgets />
        <div data-testid="nu">zone technique</div>
      </A11yProvider>,
    )
    speech.speak.mockClear()
    fireEvent.click(container.querySelector('[data-testid="nu"]')!)
    expect(speech.speak).not.toHaveBeenCalled()
  })
})
