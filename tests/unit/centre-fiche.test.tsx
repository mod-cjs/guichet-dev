/**
 * GUIC-687 — fiche Centre à onglets (Phase A) : barre d'onglets + onglet Fréquentation.
 */
import { render, screen } from '@testing-library/react'
import { CentreFicheTabs } from '@/app/admin/centres/[id]/CentreFicheTabs'
import { CentreFrequentation } from '@/app/admin/centres/[id]/CentreFrequentation'
import type { CentresAnalytics } from '@/lib/loaders/centres-analytics'
import { paginate } from '@/lib/centre-pagination'

jest.mock('@/components/ui/Icon', () => ({ Icon: () => <svg /> }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

describe('CentreFicheTabs', () => {
  it('rend les 3 onglets Phase A avec l\'onglet actif marqué', () => {
    render(<CentreFicheTabs centreId="c1" active="frequentation" />)
    expect(screen.getByRole('tab', { name: /vue d.ensemble/i })).toHaveAttribute('href', '/admin/centres/c1')
    expect(screen.getByRole('tab', { name: /ressources/i })).toHaveAttribute('href', '/admin/centres/c1?tab=ressources')
    const freq = screen.getByRole('tab', { name: /fréquentation/i })
    expect(freq).toHaveAttribute('href', '/admin/centres/c1?tab=frequentation')
    expect(freq).toHaveAttribute('aria-selected', 'true')
  })
})

describe('CentreFrequentation', () => {
  const analytics = {
    accesQr: { total: 165, parQr: 100, parManuel: 65, tauxQr: 0.606 },
    accesQrParJour: [{ date: '2026-07-01', count: 5 }, { date: '2026-07-02', count: 8 }],
  } as unknown as CentresAnalytics

  it('affiche les KPIs QR/manuel/total et le graphe par jour', () => {
    render(<CentreFrequentation analytics={analytics} checkinsInfo={paginate(0, 1)} />)
    expect(screen.getByText('165')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('61 %')).toBeInTheDocument()
    expect(screen.getByText(/Fréquentation par jour/i)).toBeInTheDocument()
  })

  it('état vide quand aucun accès', () => {
    render(<CentreFrequentation analytics={{ ...analytics, accesQrParJour: [] } as CentresAnalytics} checkinsInfo={paginate(0, 1)} />)
    expect(screen.getByText(/aucun accès enregistré/i)).toBeInTheDocument()
  })
})
