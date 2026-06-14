/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MyCJSCard, type MyCJSCardUser } from '@/components/centres/MyCJSCard'

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE'),
  },
}))

const USER: MyCJSCardUser = {
  prenom: 'Awa',
  nom: 'Diallo',
  matricule: 'GJS · AD · 23045',
  centrePrincipal: { nom: 'CJS Tambacounda', region: 'Tambacounda' },
  membreDepuis: '03/2025',
}

describe('<MyCJSCard />', () => {
  it('recto affiche prénom + nom + matricule', () => {
    render(<MyCJSCard user={USER} />)
    expect(screen.getByRole('heading', { name: /Awa Diallo/i })).toBeInTheDocument()
    expect(screen.getByText(/GJS · AD · 23045/)).toBeInTheDocument()
  })

  it('recto rend les initiales en fallback si pas de photoUrl', () => {
    render(<MyCJSCard user={USER} />)
    const initials = screen.getByTestId('my-cjs-card-initials')
    expect(initials).toHaveTextContent('AD')
  })

  it('recto rend une <img> si photoUrl fourni (pas d\'initiales)', () => {
    render(
      <MyCJSCard user={{ ...USER, photoUrl: 'https://example.test/a.jpg' }} />,
    )
    expect(screen.getByAltText(/Photo de Awa Diallo/i)).toHaveAttribute(
      'src',
      'https://example.test/a.jpg',
    )
    expect(screen.queryByTestId('my-cjs-card-initials')).toBeNull()
  })

  it('recto rend le skeleton QR si qrUrl absent', () => {
    render(<MyCJSCard user={USER} />)
    expect(screen.getByTestId('my-cjs-card-qr-skeleton')).toBeInTheDocument()
  })

  it('compact = pas de QR rendu, pas de footer centre/membre', () => {
    render(<MyCJSCard user={USER} qrUrl="https://x" compact />)
    expect(screen.queryByTestId('my-cjs-card-qr-skeleton')).toBeNull()
    expect(screen.queryByText(/Membre depuis/)).toBeNull()
  })

  it('variant verso délègue à <MyCJSCardBack> (matricule affiché)', () => {
    render(<MyCJSCard user={USER} variant="verso" />)
    expect(screen.getByLabelText(/Verso carte CJS/i)).toBeInTheDocument()
    expect(screen.getByText(/GJS · AD · 23045/)).toBeInTheDocument()
  })

  it('recto produit un container "Carte CJS" en rôle img/group pour a11y', () => {
    // Note : le gradient linear-gradient(var(--gj-teal-deep)…) est strippé par
    // jsdom (parsing CSS partial). La vérification visuelle se fait via Storybook.
    // On valide ici la présence et l'étiquette du container racine.
    render(<MyCJSCard user={USER} />)
    expect(screen.getByLabelText('Carte CJS')).toBeInTheDocument()
  })

  it('recto affiche le brand label court "Carte CJS" (GUIC-397)', () => {
    render(<MyCJSCard user={USER} />)
    // Le label apparaît dans le header de la carte. getAllByText car
    // aria-label "Carte CJS" produit également une correspondance.
    const matches = screen.getAllByText(/^Carte CJS$/i)
    expect(matches.length).toBeGreaterThan(0)
    // Pas de mention "Guichet Jeunesse CJS" en label (réservé au verso/marque).
    expect(screen.queryByText(/Guichet Jeunesse CJS/i)).toBeNull()
  })

  it('recto footer : "QR valide · expire le …" avec placeholder si pas de date (GUIC-397)', () => {
    render(<MyCJSCard user={USER} />)
    expect(screen.getByText(/QR valide.*expire le 31\/12\/2026/)).toBeInTheDocument()
  })

  it('recto footer : formatte qrExpiresAt en français long si fourni (GUIC-397)', () => {
    const expires = new Date('2026-12-31T23:59:00Z')
    render(<MyCJSCard user={USER} qrExpiresAt={expires} />)
    expect(screen.getByText(/QR valide.*expire le 31 décembre 2026/)).toBeInTheDocument()
  })
})
