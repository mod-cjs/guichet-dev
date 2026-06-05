/**
 * @jest-environment jsdom
 *
 * Tests <MyCardCjs /> (GUIC-191) — carte CJS bénéficiaire avec QR placeholder.
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MyCardCjs, formatCardId } from '@/components/profil/MyCardCjs'

describe('formatCardId', () => {
  it("compose GJS + initiales + 5 derniers chars alphanumériques du cjs_uid", () => {
    expect(formatCardId('abcdef-12345-XYZ09', 'Awa', 'Diop')).toBe('GJS · AD · XYZ09')
  })

  it("uppercase les initiales et la queue, ignore les tirets", () => {
    expect(formatCardId('aa-bb-cc-dd-ff999', 'fatou', 'sall')).toBe('GJS · FS · FF999')
  })

  it("tolère un cjs_uid court ou vide", () => {
    expect(formatCardId('', 'A', 'B')).toBe('GJS · AB · 00000')
  })
})

describe('<MyCardCjs />', () => {
  const baseProps = {
    cjsUid: '550e8400-e29b-41d4-a716-446655440000',
    nom: 'Diop',
    prenom: 'Awa',
  }

  it("rend le nom complet et l'identifiant carte formaté", () => {
    render(<MyCardCjs {...baseProps} />)
    expect(screen.getByText('Awa Diop')).toBeInTheDocument()
    expect(screen.getByTestId('mycard-id').textContent).toMatch(/^GJS · AD · /)
  })

  it("affiche le badge Membre actif", () => {
    render(<MyCardCjs {...baseProps} />)
    expect(screen.getByText(/Membre actif/i)).toBeInTheDocument()
  })

  it("affiche la mention 'Actif depuis' quand fournie", () => {
    render(<MyCardCjs {...baseProps} actifDepuis="03/2025" />)
    expect(screen.getByText(/Actif depuis 03\/2025/)).toBeInTheDocument()
  })

  it("ouvre un Sheet plein écran avec QR agrandi quand on clique sur Agrandir", () => {
    render(<MyCardCjs {...baseProps} />)
    // QR placeholder non affiché sur la carte compacte (design v2).
    expect(screen.queryByTestId('mycard-qr-large-wrap')).toBeNull()

    act(() => {
      fireEvent.click(screen.getByTestId('mycard-expand'))
    })

    // Le Sheet rend un dialog avec le QR agrandi.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('mycard-qr-large-wrap')).toBeInTheDocument()
    // Mention TODO Phase 4 visible (signature HMAC à venir).
    expect(screen.getByText(/Phase 4/i)).toBeInTheDocument()
  })

  it("le QR rendu a un rôle img avec label accessible", () => {
    render(<MyCardCjs {...baseProps} />)
    act(() => {
      fireEvent.click(screen.getByTestId('mycard-expand'))
    })
    const qr = screen.getByTestId('mycard-qr')
    expect(qr).toHaveAttribute('role', 'img')
    expect(qr).toHaveAttribute('aria-label', expect.stringMatching(/QR/i))
  })
})
