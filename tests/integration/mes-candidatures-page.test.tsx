import { render, screen } from '@testing-library/react'
import MesCandidaturesPage from '@/app/jeune/(app)/mes-candidatures/page'
import { CANDIDATURES_MOCK } from '@/components/candidatures'

describe('Mes candidatures — page intégration', () => {
  it('rend le titre H1 + la liste mock complète', () => {
    render(<MesCandidaturesPage />)
    expect(screen.getByRole('heading', { level: 1, name: /Mes candidatures/i })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(CANDIDATURES_MOCK.length)
  })

  it('rend les 6 chips de filtre', () => {
    render(<MesCandidaturesPage />)
    const group = screen.getByRole('group', { name: /filtrer les candidatures/i })
    expect(group).toBeInTheDocument()
  })

  it('rend au moins un progressbar (stepper sur cards)', () => {
    render(<MesCandidaturesPage />)
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0)
  })
})
