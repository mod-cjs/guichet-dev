import { render, screen } from '@testing-library/react'
import { YayeNudgeCard } from '@/components/dashboard/YayeNudgeCard'

describe('<YayeNudgeCard />', () => {
  it('rend le message dérivé du nombre de conseils', () => {
    render(<YayeNudgeCard nbConseils={3} />)
    expect(screen.getByText('Yaye a 3 conseils pour toi')).toBeInTheDocument()
  })

  it('singulier quand 1 conseil', () => {
    render(<YayeNudgeCard nbConseils={1} />)
    expect(screen.getByText('Yaye a 1 conseil pour toi')).toBeInTheDocument()
  })

  it('respecte un message custom', () => {
    render(<YayeNudgeCard message="Yaye attend" />)
    expect(screen.getByText('Yaye attend')).toBeInTheDocument()
  })

  it('lien par défaut vers /jeune/yaye', () => {
    render(<YayeNudgeCard />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/jeune/yaye')
  })

  it('lien custom respecté', () => {
    render(<YayeNudgeCard href="/jeune/yaye?source=dashboard" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/jeune/yaye?source=dashboard')
  })
})
