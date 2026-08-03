/**
 * @jest-environment jsdom
 *
 * <YayeMatchCard /> — score de correspondance RÉEL (GUIC-689 P2).
 *
 * Le score ne doit plus jamais être une valeur codée en dur : soit le composant
 * reçoit un `match` réel (issu de `RecommandationIA` côté serveur) et l'affiche
 * tel quel, soit il n'affiche AUCUN chiffre (carte masquée).
 */
import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { YayeMatchCard as YayeMatchCardCurrent } from '@/components/opportunites/YayeMatchCard'

// RED (GUIC-689 P2) — `match` n'existe pas encore dans `YayeMatchCardProps` (le
// score est encore codé en dur derrière `score`/`conseil`). Cast explicite pour
// que ce commit test-only compile contre la signature ACTUELLE tout en
// exerçant la signature CIBLE ; le cast disparaît de sens dès le commit GREEN
// qui introduit réellement la prop `match`.
type YayeMatchCardTarget = (props: {
  match: { score: number; raison: string } | null
  helpHref?: string
}) => ReactElement | null
const YayeMatchCard = YayeMatchCardCurrent as unknown as YayeMatchCardTarget

describe('<YayeMatchCard /> — score IA réel', () => {
  it('match=null (aucun score en cache) → carte masquée, aucun pourcentage affiché', () => {
    const { container } = render(<YayeMatchCard match={null} />)
    expect(screen.queryByTestId('yaye-match-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('yaye-match-score')).not.toBeInTheDocument()
    // Assertion explicite : aucun « % » nulle part dans le rendu.
    expect(container.textContent ?? '').not.toMatch(/\d+\s*%/)
  })

  it('match réel → pourcentage dérivé de match.score et raison réelle affichés (pas 94% codé en dur)', () => {
    render(
      <YayeMatchCard
        match={{ score: 0.73, raison: 'adaptée à ton niveau d’étude et ton profil' }}
      />,
    )
    expect(screen.getByTestId('yaye-match-card')).toBeInTheDocument()
    expect(screen.getByTestId('yaye-match-score')).toHaveTextContent('73%')
    expect(screen.getByText('adaptée à ton niveau d’étude et ton profil')).toBeInTheDocument()
  })

  it('convertit le score normalisé [0,1] en pourcentage entier (0.6 → 60%)', () => {
    render(
      <YayeMatchCard
        match={{ score: 0.6, raison: 'correspond à ton parcours et tes centres d’intérêt' }}
      />,
    )
    expect(screen.getByTestId('yaye-match-score')).toHaveTextContent('60%')
  })

  it('un score différent produit un pourcentage différent (pas de valeur figée)', () => {
    const { rerender } = render(<YayeMatchCard match={{ score: 0.2, raison: 'r' }} />)
    expect(screen.getByTestId('yaye-match-score')).toHaveTextContent('20%')
    rerender(<YayeMatchCard match={{ score: 0.95, raison: 'r' }} />)
    expect(screen.getByTestId('yaye-match-score')).toHaveTextContent('95%')
  })
})
