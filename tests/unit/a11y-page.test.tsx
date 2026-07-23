import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { A11yProvider } from '@/components/a11y/A11yProvider'
import { AccessibiliteClient } from '@/app/jeune/(app)/accessibilite/AccessibiliteClient'

const mockAction = jest.fn().mockResolvedValue(undefined)
jest.mock('@/app/jeune/(app)/accessibilite/actions', () => ({
  modifierPrefsAccessibilite: (...a: unknown[]) => mockAction(...a),
}))

const html = () => document.documentElement

const A11Y_ATTRS = [
  'data-text',
  'data-contrast',
  'data-gray',
  'data-motion',
  'data-spacing',
  'data-falc',
  'data-kbd',
  'data-cursor',
  'data-guide',
  'data-voice',
]

function renderPage() {
  return render(
    <A11yProvider>
      <AccessibiliteClient />
    </A11yProvider>,
  )
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  for (const a of A11Y_ATTRS) html().removeAttribute(a)
  mockAction.mockClear()
})

describe('<AccessibiliteClient /> — page /jeune/accessibilite', () => {
  it('affiche le hero et les groupes de réglages du design v4', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: /inclusion & accessibilité/i, level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /taille du texte/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^vision$/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /lecture & compréhension/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^navigation$/i })).toBeInTheDocument()
  })

  it('propose les 4 tailles S/M/L/XL avec M active par défaut (aria-pressed)', () => {
    renderPage()
    const m = screen.getByRole('button', { name: /normal/i })
    expect(m).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /très grand/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('taille XL → data-text=xl sur <html> + persistance serveur', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /très grand/i }))
    expect(html()).toHaveAttribute('data-text', 'xl')
    expect(mockAction).toHaveBeenCalledWith(expect.objectContaining({ text: 'xl' }))
  })

  it('toggle Contraste élevé → data-contrast=high + persistance serveur', () => {
    renderPage()
    fireEvent.click(screen.getByRole('switch', { name: /contraste élevé/i }))
    expect(html()).toHaveAttribute('data-contrast', 'high')
    expect(mockAction).toHaveBeenCalledWith(
      expect.objectContaining({ contrast: true }),
    )
  })

  it('expose les 6 interrupteurs de réglages (rôle switch)', () => {
    renderPage()
    for (const name of [
      /contraste élevé/i,
      /niveaux de gris/i,
      /réduire les animations/i,
      /espacement du texte/i,
      /mode falc/i,
      /navigation clavier renforcée/i,
    ]) {
      expect(screen.getByRole('switch', { name })).toBeInTheDocument()
    }
  })

  // GUIC-658 — phase 2 : lecture vocale, grand curseur, guide de lecture
  it('expose les 3 interrupteurs phase 2 (rôle switch)', () => {
    renderPage()
    for (const name of [/lecture vocale/i, /grand curseur/i, /guide de lecture/i]) {
      expect(screen.getByRole('switch', { name })).toBeInTheDocument()
    }
  })

  it('toggle Lecture vocale → data-voice=on + persistance (10 clés)', () => {
    renderPage()
    fireEvent.click(screen.getByRole('switch', { name: /lecture vocale/i }))
    expect(html()).toHaveAttribute('data-voice', 'on')
    expect(mockAction).toHaveBeenCalledWith(
      expect.objectContaining({ voice: true, cursor: false, guide: false }),
    )
  })

  it('la ligne Lecture vocale reste visible sur mobile (pas de lg:)', () => {
    renderPage()
    const row = screen
      .getByRole('switch', { name: /lecture vocale/i })
      .closest('div[class*="flex"]')
    expect((row as HTMLElement).className).not.toMatch(/hidden/)
  })

  it('lignes Grand curseur et Guide de lecture masquées sur mobile (lg only)', () => {
    renderPage()
    for (const name of [/grand curseur/i, /guide de lecture/i]) {
      const row = screen.getByRole('switch', { name }).closest('[class*="lg:flex"]')
      expect(row).not.toBeNull()
      expect((row as HTMLElement).className).toMatch(/hidden/)
    }
  })

  it('mentionne la persistance par profil (note bas de page)', () => {
    renderPage()
    expect(screen.getByText(/liés à ton profil/i)).toBeInTheDocument()
  })

  it('« Tout réinitialiser » remet les défauts (attributs retirés) + persistance', () => {
    renderPage()
    fireEvent.click(screen.getByRole('switch', { name: /mode falc/i }))
    expect(html()).toHaveAttribute('data-falc', 'on')
    fireEvent.click(screen.getByRole('button', { name: /tout réinitialiser/i }))
    for (const a of A11Y_ATTRS) expect(html()).not.toHaveAttribute(a)
    expect(mockAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ falc: false, text: 'm' }),
    )
  })
})
