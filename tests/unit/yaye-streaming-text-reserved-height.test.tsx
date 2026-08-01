/**
 * @jest-environment jsdom
 *
 * GUIC-689 (vague 3, Lot G1) — règle handoff design v5 : « La bulle de réponse
 * en flux réserve dès le premier mot la hauteur du texte entier, sinon la
 * conversation sursaute à chaque ligne ».
 *
 * ARBITRAGE ASSUMÉ (à documenter au registre des écarts) : la maquette révèle
 * un texte DÉJÀ CONNU (effet purement visuel), alors qu'ici le flux LLM a une
 * longueur finale inconnue à l'avance — on ne peut donc pas réserver la
 * hauteur EXACTE du texte final sans deviner (ce qui produirait un espace
 * vide arbitraire et faux). Mitigation retenue : la bulle réserve la hauteur
 * du texte DÉJÀ REÇU — un `min-height` qui ne redescend JAMAIS pendant tout
 * le flux, même si une mesure DOM ponctuelle (reflow/scroll/police encore en
 * chargement) redescend. Ça supprime le sursaut vers l'ARRIÈRE (le cas grave :
 * la bulle qui rétrécit puis regrossit) ; un agrandissement vers l'avant à
 * l'arrivée de nouveau texte reste possible et attendu (on ne peut pas faire
 * autrement sans connaître la longueur finale).
 *
 * Sentinelle : prouver que la hauteur réservée (style `min-height` appliqué
 * au conteneur de streaming) ne DIMINUE JAMAIS entre deux rendus successifs
 * pendant la révélation, y compris quand la mesure DOM sous-jacente redescend
 * (bruit de reflow).
 */
import { act, render, screen, cleanup } from '@testing-library/react'
import { YayeStreamingText } from '@/components/yaye/YayeStreamingText'

describe('YayeStreamingText — hauteur réservée monotone (jamais décroissante)', () => {
  let heights: number[]
  let call = 0

  beforeEach(() => {
    call = 0
    heights = []
    // jsdom ne calcule pas de vrai layout : on contrôle nous-mêmes la valeur
    // de `scrollHeight` retournée à chaque mesure, pour simuler un DOM réel
    // dont la mesure peut redescendre ponctuellement (bruit de reflow).
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        const v = heights[Math.min(call, heights.length - 1)] ?? 0
        call += 1
        return v
      },
    })
  })

  afterEach(() => {
    cleanup()
    // @ts-expect-error nettoyage du mock jsdom entre les tests
    delete HTMLElement.prototype.scrollHeight
    jest.useRealTimers()
  })

  it('le min-height appliqué au conteneur ne redescend jamais, même si la mesure DOM redescend', () => {
    jest.useFakeTimers()
    // Séquence volontairement non monotone (bruit de reflow) : pic à 100, puis redescend à 30.
    heights = [40, 80, 60, 55, 100, 30, 30, 30]

    render(
      <YayeStreamingText text="Un texte assez long pour déclencher plusieurs mesures successives pendant la révélation progressive de la bulle de streaming Yaye." />,
    )

    const el = screen.getByTestId('yaye-streaming') as HTMLElement
    let previousMinHeight = 0

    for (let i = 0; i < 16; i += 1) {
      act(() => {
        jest.advanceTimersByTime(16)
      })
      const current = parseFloat(el.style.minHeight || '0')
      expect(current).toBeGreaterThanOrEqual(previousMinHeight)
      previousMinHeight = current
    }

    // Le pic mesuré (100) doit avoir été retenu malgré la redescente à 30 ensuite.
    expect(previousMinHeight).toBeGreaterThanOrEqual(100)
  })

  it('sans historique de mesure (texte très court, une seule frame), min-height reste cohérent avec la 1ère mesure', () => {
    jest.useFakeTimers()
    heights = [12]

    render(<YayeStreamingText text="Ok" />)
    const el = screen.getByTestId('yaye-streaming') as HTMLElement

    act(() => {
      jest.advanceTimersByTime(16)
    })

    expect(parseFloat(el.style.minHeight || '0')).toBeGreaterThanOrEqual(12)
  })
})
