import { render, screen } from '@testing-library/react'
import { MiniOppCard, type MiniOpp } from '@/components/dashboard/MiniOppCard'

const opp: MiniOpp = {
  id:    'o1',
  titre: 'Stage Data Science',
  org:   'Sonatel · Dakar',
  tag:   'STAGE · J-9',
  tone:  'teal',
  match: '87% match',
  href:  '/opportunites/o1',
}

describe('<MiniOppCard />', () => {
  it('rend titre, org, tag et match', () => {
    render(<MiniOppCard opp={opp} />)
    expect(screen.getByText('Stage Data Science')).toBeInTheDocument()
    expect(screen.getByText('Sonatel · Dakar')).toBeInTheDocument()
    expect(screen.getByText('STAGE · J-9')).toBeInTheDocument()
    expect(screen.getByText('87% match')).toBeInTheDocument()
  })

  it('lien vers la page détail', () => {
    render(<MiniOppCard opp={opp} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/opportunites/o1')
  })

  it('applique la largeur fixe quand widthPx fourni', () => {
    render(<MiniOppCard opp={opp} widthPx={250} />)
    const link = screen.getByRole('link') as HTMLElement
    expect(link.style.width).toBe('250px')
  })

  it('omet le match quand non fourni', () => {
    const noMatch: MiniOpp = { ...opp, match: undefined }
    render(<MiniOppCard opp={noMatch} />)
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument()
  })
})
