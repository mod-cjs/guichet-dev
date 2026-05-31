import { render, screen, fireEvent } from '@testing-library/react'
import { YayeActionCard } from '@/components/ui/Yaye/YayeActionCard'

describe('<YayeActionCard />', () => {
  const actions = [
    { icon: 'check' as const, label: 'Action 1' },
    { icon: 'document' as const, label: 'Action 2' },
  ]

  it('rend titre par défaut + sous-titre + actions', () => {
    render(<YayeActionCard subtitle="2 actions" actions={actions} />)
    expect(screen.getByText(/Yaye a agi pour toi/i)).toBeInTheDocument()
    expect(screen.getByText('2 actions')).toBeInTheDocument()
    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
  })

  it('accepte un titre personnalisé', () => {
    render(<YayeActionCard title="Yaye a complété" actions={actions} />)
    expect(screen.getByText('Yaye a complété')).toBeInTheDocument()
  })

  it('appelle onClick au clic sur les boutons', () => {
    const onPrimary = jest.fn()
    const onSecondary = jest.fn()
    render(
      <YayeActionCard
        actions={actions}
        buttons={[
          { label: 'Voir', onClick: onPrimary, primary: true },
          { label: 'Ignorer', onClick: onSecondary },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /voir/i }))
    fireEvent.click(screen.getByRole('button', { name: /ignorer/i }))
    expect(onPrimary).toHaveBeenCalledTimes(1)
    expect(onSecondary).toHaveBeenCalledTimes(1)
  })

  it('ne rend pas la zone boutons si aucun bouton', () => {
    render(<YayeActionCard actions={actions} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
