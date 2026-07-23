import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  A11yProvider,
  useA11y,
  A11Y_STORAGE_KEY,
  A11Y_DEFAULTS,
  sanitizeA11yPrefs,
} from '@/components/a11y/A11yProvider'

/** Consommateur minimal pour piloter le contexte dans les tests. */
function Harness() {
  const { prefs, setPref, reset } = useA11y()
  return (
    <div>
      <span data-testid="text-value">{prefs.text}</span>
      <button onClick={() => setPref('contrast', true)}>contrast-on</button>
      <button onClick={() => setPref('text', 'xl')}>text-xl</button>
      <button onClick={() => setPref('text', 'm')}>text-m</button>
      <button onClick={() => reset()}>reset</button>
    </div>
  )
}

const html = () => document.documentElement

const A11Y_ATTRS = [
  'data-text',
  'data-contrast',
  'data-gray',
  'data-motion',
  'data-spacing',
  'data-falc',
  'data-kbd',
  // GUIC-658 — phase 2
  'data-cursor',
  'data-guide',
  'data-voice',
]

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  for (const a of A11Y_ATTRS) html().removeAttribute(a)
})

describe('<A11yProvider />', () => {
  it('ne pose AUCUN attribut par défaut (design inchangé sans opt-in)', () => {
    render(
      <A11yProvider>
        <Harness />
      </A11yProvider>,
    )
    for (const a of A11Y_ATTRS) expect(html()).not.toHaveAttribute(a)
  })

  it('applique data-contrast=high et persiste en localStorage à l’activation', () => {
    render(
      <A11yProvider>
        <Harness />
      </A11yProvider>,
    )
    fireEvent.click(screen.getByText('contrast-on'))
    expect(html()).toHaveAttribute('data-contrast', 'high')
    const stored = JSON.parse(window.localStorage.getItem(A11Y_STORAGE_KEY) ?? '{}')
    expect(stored.contrast).toBe(true)
  })

  it('pose data-text uniquement hors défaut, et le retire au retour à M', () => {
    render(
      <A11yProvider>
        <Harness />
      </A11yProvider>,
    )
    fireEvent.click(screen.getByText('text-xl'))
    expect(html()).toHaveAttribute('data-text', 'xl')
    fireEvent.click(screen.getByText('text-m'))
    expect(html()).not.toHaveAttribute('data-text')
  })

  it('restaure les préférences depuis localStorage au mount', () => {
    window.localStorage.setItem(
      A11Y_STORAGE_KEY,
      JSON.stringify({ ...A11Y_DEFAULTS, falc: true, text: 'l' }),
    )
    render(
      <A11yProvider>
        <Harness />
      </A11yProvider>,
    )
    expect(html()).toHaveAttribute('data-falc', 'on')
    expect(html()).toHaveAttribute('data-text', 'l')
  })

  it('donne priorité à la valeur serveur (initial) sur localStorage et resynchronise', () => {
    window.localStorage.setItem(
      A11Y_STORAGE_KEY,
      JSON.stringify({ ...A11Y_DEFAULTS, contrast: true }),
    )
    render(
      <A11yProvider initial={{ ...A11Y_DEFAULTS, gray: true }}>
        <Harness />
      </A11yProvider>,
    )
    expect(html()).toHaveAttribute('data-gray', 'on')
    expect(html()).not.toHaveAttribute('data-contrast')
    const stored = JSON.parse(window.localStorage.getItem(A11Y_STORAGE_KEY) ?? '{}')
    expect(stored.gray).toBe(true)
    expect(stored.contrast).toBe(false)
  })

  it('retire tous les attributs au démontage (pas de fuite hors espace jeune)', () => {
    const { unmount } = render(
      <A11yProvider initial={{ ...A11Y_DEFAULTS, contrast: true, spacing: true }}>
        <Harness />
      </A11yProvider>,
    )
    expect(html()).toHaveAttribute('data-contrast', 'high')
    unmount()
    for (const a of A11Y_ATTRS) expect(html()).not.toHaveAttribute(a)
  })

  it('retombe sur les défauts sans throw si localStorage est corrompu', () => {
    window.localStorage.setItem(A11Y_STORAGE_KEY, '{pas-du-json')
    expect(() =>
      render(
        <A11yProvider>
          <Harness />
        </A11yProvider>,
      ),
    ).not.toThrow()
    for (const a of A11Y_ATTRS) expect(html()).not.toHaveAttribute(a)
    expect(screen.getByTestId('text-value')).toHaveTextContent('m')
  })

  // GUIC-658 — phase 2 : curseur agrandi, guide de lecture, lecture vocale
  it('applique data-cursor/data-guide/data-voice quand activés (phase 2)', () => {
    render(
      <A11yProvider
        initial={{ ...A11Y_DEFAULTS, cursor: true, guide: true, voice: true }}
      >
        <Harness />
      </A11yProvider>,
    )
    expect(html()).toHaveAttribute('data-cursor', 'on')
    expect(html()).toHaveAttribute('data-guide', 'on')
    expect(html()).toHaveAttribute('data-voice', 'on')
  })

  it('reset() retire tous les attributs et réécrit les défauts', () => {
    render(
      <A11yProvider initial={{ ...A11Y_DEFAULTS, falc: true, text: 'xl' }}>
        <Harness />
      </A11yProvider>,
    )
    fireEvent.click(screen.getByText('reset'))
    for (const a of A11Y_ATTRS) expect(html()).not.toHaveAttribute(a)
    const stored = JSON.parse(window.localStorage.getItem(A11Y_STORAGE_KEY) ?? '{}')
    expect(stored).toEqual(A11Y_DEFAULTS)
  })
})

describe('sanitizeA11yPrefs()', () => {
  it('normalise une valeur inconnue vers les défauts', () => {
    expect(sanitizeA11yPrefs(null)).toEqual(A11Y_DEFAULTS)
    expect(sanitizeA11yPrefs('x')).toEqual(A11Y_DEFAULTS)
    expect(sanitizeA11yPrefs(42)).toEqual(A11Y_DEFAULTS)
    expect(sanitizeA11yPrefs([{ contrast: true }])).toEqual(A11Y_DEFAULTS)
  })

  it('strippe les clés inconnues et corrige les types invalides', () => {
    const out = sanitizeA11yPrefs({
      text: 'géant',
      contrast: 'oui',
      falc: true,
      injecte: 'hack',
    })
    expect(out).toEqual({ ...A11Y_DEFAULTS, falc: true })
    expect('injecte' in out).toBe(false)
  })

  it('accepte un shape valide complet', () => {
    const valid = {
      text: 'xl' as const,
      contrast: true,
      gray: false,
      motion: true,
      spacing: false,
      falc: false,
      kbd: true,
      cursor: true,
      guide: false,
      voice: true,
    }
    expect(sanitizeA11yPrefs(valid)).toEqual(valid)
  })

  // GUIC-658 — rétro-compat : Json phase 1 (7 clés) → nouvelles clés à false
  it('complète un shape phase 1 (7 clés) avec cursor/guide/voice=false', () => {
    const phase1 = {
      text: 'l',
      contrast: true,
      gray: false,
      motion: false,
      spacing: false,
      falc: true,
      kbd: false,
    }
    expect(sanitizeA11yPrefs(phase1)).toEqual({
      ...phase1,
      cursor: false,
      guide: false,
      voice: false,
    })
  })
})
