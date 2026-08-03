/**
 * @jest-environment jsdom
 *
 * GUIC-689 — La pastille d'échéance des cartes Yaye doit rester un SIGNAL.
 *
 * `buildDeadlineInfo` a changé de contrat pour la carte de liste : son `label`
 * porte désormais toujours une date lisible (« 12 juin »), le compte à rebours
 * étant rendu par la pastille séparée de `OppCard`. Effet de bord : cette carte
 * de recommandation, qui affiche `dl.label` brut dans une pastille compacte,
 * s'est mise à afficher « 12 juin » là où elle montrait « J-3 ».
 *
 * Dans un format compact, la date seule fait perdre l'urgence : « J-3 » est le
 * signal utile. On rétablit le compte à rebours tant que l'échéance est proche.
 */
import { render, screen } from '@testing-library/react'

import { YayeOppCard } from '@/components/yaye/YayeOppCard'

const NOW = new Date('2026-06-10T12:00:00.000Z').getTime()
const dansNJours = (n: number) => new Date(NOW + n * 86_400_000).toISOString()

function renderCard(deadline: string | null) {
  return render(
    <YayeOppCard
      opp={{
        id: 'o1',
        slug: 'stage-data',
        titre: 'Stage Data Science',
        type: 'Stage',
        organisation: 'Sonatel',
        region: 'Dakar',
        deadline,
      } as never}
    />,
  )
}

describe('GUIC-689 — pastille d’échéance des cartes Yaye', () => {
  const realNow = Date.now
  beforeAll(() => { Date.now = () => NOW })
  afterAll(() => { Date.now = realNow })

  it('échéance urgente : compte à rebours, pas une date', () => {
    renderCard(dansNJours(3))
    expect(screen.getByText('J-3')).toBeInTheDocument()
    expect(screen.queryByText(/juin/i)).not.toBeInTheDocument()
  })

  it('échéance proche (≤ 7 j) : compte à rebours également', () => {
    renderCard(dansNJours(6))
    expect(screen.getByText('J-6')).toBeInTheDocument()
  })

  it('échéance du jour : libellé explicite', () => {
    renderCard(dansNJours(0))
    expect(screen.getByText(/aujourd/i)).toBeInTheDocument()
  })

  it('échéance lointaine : date lisible (le compte à rebours n’a plus de valeur de signal)', () => {
    renderCard(dansNJours(40))
    expect(screen.queryByText(/^J-\d+$/)).not.toBeInTheDocument()
  })

  it('sans échéance : aucune pastille (rien à signaler)', () => {
    renderCard(null)
    expect(screen.queryByText(/^J-\d+$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/aujourd/i)).not.toBeInTheDocument()
  })
})
