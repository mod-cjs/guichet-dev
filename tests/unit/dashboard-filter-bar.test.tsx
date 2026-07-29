/**
 * GUIC-679 phase 2 — DashboardFilterBar : période + région, pilotés par l'URL.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const push = jest.fn()
let params = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => params,
}))
jest.mock('@/components/ui/Icon', () => ({ Icon: () => <svg /> }))

import { DashboardFilterBar } from '@/app/admin/tableau-de-bord/DashboardFilterBar'

beforeEach(() => {
  push.mockClear()
  params = new URLSearchParams()
})

describe('DashboardFilterBar', () => {
  it('rend les 4 périodes + le select région', () => {
    render(<DashboardFilterBar filters={{ periode: '12mois', region: 'all' }} />)
    expect(screen.getByRole('tab', { name: 'Ce mois' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '12 mois' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('combobox', { name: /région/i })).toBeInTheDocument()
  })

  it('cliquer une période met à jour l\'URL', async () => {
    render(<DashboardFilterBar filters={{ periode: '12mois', region: 'all' }} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Ce mois' }))
    expect(push).toHaveBeenCalledWith(expect.stringContaining('periode=mois'), expect.anything())
  })

  it('choisir une région met à jour l\'URL', async () => {
    render(<DashboardFilterBar filters={{ periode: '12mois', region: 'all' }} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /région/i }), 'Dakar')
    expect(push).toHaveBeenCalledWith(expect.stringContaining('region=Dakar'), expect.anything())
  })

  it('période par défaut (12mois) nettoie le param plutôt que de l\'ajouter', async () => {
    render(<DashboardFilterBar filters={{ periode: 'mois', region: 'all' }} />)
    await userEvent.click(screen.getByRole('tab', { name: '12 mois' }))
    // 12mois = défaut → URL sans ?periode
    expect(push).toHaveBeenCalledWith('/admin/tableau-de-bord', expect.anything())
  })

  it('affiche le retour "National" quand une région est active', () => {
    render(<DashboardFilterBar filters={{ periode: '12mois', region: 'Dakar' }} />)
    expect(screen.getByRole('button', { name: /national/i })).toBeInTheDocument()
  })
})
