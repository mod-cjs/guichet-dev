/**
 * GUIC-366 (branchement) — visionneuse inline sur la page détail ressource :
 * PDF rendu via le proxy, vidéo YouTube/Vimeo embarquée, lien externe = CTA seul.
 */
import { render, screen } from '@testing-library/react'
import { RessourceDetailClient } from '@/app/(public)/ressources/[id]/ressource-detail-client'
import type { RessourceDetail } from '@/lib/loaders/ressources'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => null }) as unknown as typeof fetch
})

function makeDetail(over: Partial<RessourceDetail> = {}): RessourceDetail {
  return {
    id: 'r1', titre: 'Doc', description: 'desc', type: 'PDF', theme: 'Emploi',
    url: 'https://example.org/doc.pdf', vues: 0, niveau: null, langue: null,
    categorie: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', ...over,
  }
}

describe('RessourceDetailClient — visionneuse inline', () => {
  it('PDF → visionneuse inline servie par le proxy (/api/ressources/<id>/proxy)', () => {
    render(<RessourceDetailClient detail={makeDetail({ type: 'PDF', titre: 'Mon PDF' })} pageUrl="https://app/r1" />)
    const iframe = screen.getByTitle('Mon PDF')
    expect(iframe).toHaveAttribute('src', '/api/ressources/r1/proxy')
  })

  it('Vidéo YouTube → embed inline (youtube.com/embed/<id>)', () => {
    render(
      <RessourceDetailClient
        detail={makeDetail({ type: 'Video', titre: 'Ma Vidéo', url: 'https://www.youtube.com/watch?v=ABC123xyz' })}
        pageUrl="https://app/r1"
      />,
    )
    const iframe = screen.getByTitle('Ma Vidéo')
    expect(iframe.getAttribute('src')).toContain('youtube.com/embed/ABC123xyz')
  })

  it('Lien externe → aucune visionneuse, seulement le CTA', () => {
    render(<RessourceDetailClient detail={makeDetail({ type: 'Lien', titre: 'Un lien', url: 'https://anpej.sn' })} pageUrl="https://app/r1" />)
    expect(screen.queryByTitle('Un lien')).toBeNull() // pas d'iframe
    expect(screen.getByTestId('ressource-consult-cta')).toBeInTheDocument()
  })
})
