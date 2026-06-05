import { render, screen } from '@testing-library/react'
import { WebDashTracker, type TrackerItem } from '@/components/dashboard/WebDashTracker'

const sample: TrackerItem[] = [
  {
    id: 't1', title: 'Bourse agricole', subtitle: 'Déposée le 14 mai',
    icon: 'agriculture', tone: 'red',
    currentStep: 2, stepLabel: 'Revue conseiller CJS',
    cta: { label: 'Compléter dossier', href: '/a/b' },
  },
  {
    id: 't2', title: 'Stage Sonatel', subtitle: 'Entretien planifié',
    icon: 'employment', tone: 'teal',
    currentStep: 3, stepLabel: 'Entretien',
    cta: { label: 'Préparer', href: '/c/d', variant: 'ghost' },
  },
]

describe('<WebDashTracker />', () => {
  it('rend chaque candidature avec son titre', () => {
    render(<WebDashTracker items={sample} />)
    expect(screen.getByText('Bourse agricole')).toBeInTheDocument()
    expect(screen.getByText('Stage Sonatel')).toBeInTheDocument()
  })

  it('expose un role="progressbar" par item avec aria-valuenow', () => {
    render(<WebDashTracker items={sample} />)
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(2)
    expect(bars[0]).toHaveAttribute('aria-valuenow', '2')
    expect(bars[0]).toHaveAttribute('aria-valuemax', '5')
    expect(bars[1]).toHaveAttribute('aria-valuenow', '3')
  })

  it('rend les CTA en tant que liens', () => {
    render(<WebDashTracker items={sample} />)
    expect(screen.getByRole('link', { name: /Compléter dossier/i })).toHaveAttribute('href', '/a/b')
    expect(screen.getByRole('link', { name: /Préparer/i })).toHaveAttribute('href', '/c/d')
  })

  it('rend un message vide si pas d\'items', () => {
    render(<WebDashTracker items={[]} />)
    expect(screen.getByText(/Aucune candidature en cours/i)).toBeInTheDocument()
  })
})
