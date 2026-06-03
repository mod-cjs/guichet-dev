/**
 * GUIC-189 — Tests UI du détail opportunité v2 (tabs, CTA, sticky).
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { OpportuniteDetail } from '@/components/opportunites/OpportuniteDetail'
import { FavorisProvider } from '@/components/opportunites/FavorisProvider'
import type { OpportuniteDetail as Detail } from '@/types/candidature'

// Mocks Next : useSearchParams + l'URL `/api/candidatures` du useEffect d'init
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  usePathname: () => '/opportunites/test',
}))

const DETAIL: Detail = {
  id: 'op-1',
  slug: 'stage-sonatel',
  titre: 'Stage Data Science · 6 mois',
  description: 'Très belle opportunité chez Sonatel.',
  type: 'Stage',
  domaine: 'Numerique',
  region: 'Dakar',
  organisation: 'Sonatel',
  remuneration: '350 000 F/mois',
  deadline: new Date(Date.now() + 6 * 86_400_000).toISOString(),
  lienExterne: 'https://sonatel.sn',
  vues: 42,
  statut: 'publiee',
  programme: { slug: 'yeah', nom: 'YEAH' },
  typeSlug: 'stage',
  actionLabel: 'Postuler',
  requiresFileUpload: true,
  fileLabel: 'CV',
  skills: [
    { slug: 'python', libelle: 'Python', requise: true },
    { slug: 'sql', libelle: 'SQL', requise: false },
  ],
  tags: [{ slug: 'data', libelle: 'Data' }],
  details: null,
}

function wrap(node: React.ReactNode) {
  return (
    <FavorisProvider isAuthenticated={false}>{node}</FavorisProvider>
  )
}

describe('<OpportuniteDetail /> (GUIC-189)', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch
  })

  it('rend le hero avec titre + organisation + badge type', () => {
    render(wrap(<OpportuniteDetail detail={DETAIL} viewer={null} />))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Stage Data Science/)
    expect(screen.getByText('Sonatel')).toBeInTheDocument()
    expect(screen.getAllByText(/stage/i).length).toBeGreaterThan(0)
  })

  it('affiche les 4 onglets et bascule vers Critères', () => {
    render(wrap(<OpportuniteDetail detail={DETAIL} viewer={null} />))
    const tabCriteres = screen.getByRole('tab', { name: /Critères/i })
    fireEvent.click(tabCriteres)
    expect(tabCriteres).toHaveAttribute('aria-selected', 'true')
    // La compétence Python (requise) est visible
    expect(screen.getByText('Python')).toBeInTheDocument()
  })

  it('CTA non-connecté → "Se connecter pour postuler"', () => {
    render(wrap(<OpportuniteDetail detail={DETAIL} viewer={null} />))
    expect(
      screen.getByRole('button', { name: /Se connecter pour postuler/i }),
    ).toBeInTheDocument()
  })

  it('CTA expiré → bouton désactivé "Candidatures closes"', () => {
    const expired: Detail = {
      ...DETAIL,
      deadline: new Date(Date.now() - 86_400_000).toISOString(),
    }
    render(
      wrap(
        <OpportuniteDetail
          detail={expired}
          viewer={{ prenom: 'A', nom: 'B', email: null, telephone: '+221770000000' }}
        />,
      ),
    )
    const cta = screen.getByRole('button', { name: /Candidatures closes/i })
    expect(cta).toBeDisabled()
  })
})
