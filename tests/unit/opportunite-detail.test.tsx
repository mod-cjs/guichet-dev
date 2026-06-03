import { render, screen } from '@testing-library/react'
import { OpportuniteDetail, URGENT_DAYS_THRESHOLD } from '@/components/opportunites/OpportuniteDetail'
import { FavorisProvider } from '@/components/opportunites/FavorisProvider'
import type { OpportuniteDetail as Detail } from '@/types/candidature'

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}))

// next/dynamic — rend directement le module (pas de Suspense pendant les tests)
jest.mock('next/dynamic', () => () => {
  const Comp = () => null
  Comp.displayName = 'DynamicStub'
  return Comp
})

function makeDetail(over: Partial<Detail> = {}): Detail {
  return {
    id: 'o1',
    slug: 'stage-data',
    titre: 'Stage Data Science',
    description: 'Description.',
    type: 'Stage',
    domaine: 'Numerique',
    region: 'Dakar',
    organisation: 'Sonatel',
    remuneration: null,
    deadline: null,
    lienExterne: null,
    vues: 0,
    statut: 'PUBLIEE',
    programme: null,
    typeSlug: null,
    actionLabel: null,
    requiresFileUpload: false,
    fileLabel: null,
    skills: [],
    tags: [],
    details: null,
    ...over,
  } as Detail
}

function wrap(node: React.ReactNode) {
  return <FavorisProvider isAuthenticated={false}>{node}</FavorisProvider>
}

describe('<OpportuniteDetail /> badge fusionné (GUIC-221 #1)', () => {
  it("rend une seule pill avec le type seul si pas de deadline urgente (> 7j)", () => {
    const detail = makeDetail({ deadline: new Date(Date.now() + 30 * 86_400_000).toISOString() })
    render(wrap(<OpportuniteDetail detail={detail} viewer={null} />))
    const badge = screen.getByTestId('detail-badge')
    // Une seule pill — un seul <span data-tone>
    const pills = badge.querySelectorAll('[data-tone]')
    expect(pills.length).toBe(1)
    // Pas de suffixe CLÔTURE quand > 7 jours
    expect(badge.textContent).not.toMatch(/CLÔTURE/i)
  })

  it("colorise en rouge + suffixe J-N + icône quand urgent (J ≤ seuil)", () => {
    const days = URGENT_DAYS_THRESHOLD - 1 // 2 jours
    const detail = makeDetail({ deadline: new Date(Date.now() + days * 86_400_000 + 3600_000).toISOString() })
    render(wrap(<OpportuniteDetail detail={detail} viewer={null} />))
    const badge = screen.getByTestId('detail-badge')
    const pill = badge.querySelector('[data-tone]') as HTMLElement
    expect(pill.getAttribute('data-tone')).toBe('red')
    expect(badge.textContent).toMatch(/CLÔTURE J-/)
  })

  it("affiche CLÔTURÉE en rouge quand deadline expirée", () => {
    const detail = makeDetail({ deadline: new Date(Date.now() - 86_400_000).toISOString() })
    render(wrap(<OpportuniteDetail detail={detail} viewer={null} />))
    const badge = screen.getByTestId('detail-badge')
    const pill = badge.querySelector('[data-tone]') as HTMLElement
    expect(pill.getAttribute('data-tone')).toBe('red')
    expect(badge.textContent).toMatch(/CLÔTUR/)
  })
})

describe('<OpportuniteDetail /> smart format date (GUIC-221 #5)', () => {
  it("formate la date d'échéance sans année si année courante", () => {
    const year = new Date().getFullYear()
    const detail = makeDetail({ deadline: `${year}-12-12T00:00:00.000Z` })
    render(wrap(<OpportuniteDetail detail={detail} viewer={null} />))
    // KeyFact "Échéance" — la valeur doit contenir "12 décembre" sans l'année
    const echeance = screen.getByText(/Échéance/i).parentElement
    expect(echeance?.textContent).toMatch(/12 décembre/)
    expect(echeance?.textContent).not.toMatch(new RegExp(String(year)))
  })

  it("inclut l'année si année différente", () => {
    const detail = makeDetail({ deadline: '2099-12-12T00:00:00.000Z' })
    render(wrap(<OpportuniteDetail detail={detail} viewer={null} />))
    const echeance = screen.getByText(/Échéance/i).parentElement
    expect(echeance?.textContent).toMatch(/2099/)
  })
})
