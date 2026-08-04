/**
 * @jest-environment jsdom
 *
 * Règle NON NÉGOCIABLE design v5 : « animations réduites » doit couper les
 * MINUTERIES JS, pas seulement l'animation CSS. `YayeStreamingText` ne lisait
 * QUE `prefers-reduced-motion` (OS/navigateur) — le réglage applicatif
 * `/jeune/accessibilite` (attribut `data-motion="reduce"` sur `<html>`, posé
 * par `A11yProvider` ET par le script anti-FOUC) n'était jamais consulté, et
 * le `setInterval` de la machine à écrire continuait de tourner. GUIC-689
 * (vague 2).
 *
 * NB : `/jeune/yaye` (page fullscreen) N'EST PAS montée sous `A11yProvider`
 * (cf. `src/app/jeune/layout.tsx` vs `src/app/jeune/(app)/layout.tsx`) —
 * le hook doit donc fonctionner en lisant l'attribut DOM directement, sans
 * dépendre d'un contexte React qui peut être absent.
 */
import { act, render, screen, cleanup } from '@testing-library/react'
import { YayeStreamingText } from '@/components/yaye/YayeStreamingText'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-motion')
  jest.useRealTimers()
})

describe('YayeStreamingText — data-motion="reduce" coupe le minuteur JS', () => {
  it('texte affiché intégralement immédiatement et AUCUN minuteur actif quand data-motion=reduce est posé AVANT le montage', () => {
    jest.useFakeTimers()
    document.documentElement.dataset.motion = 'reduce'

    render(<YayeStreamingText text="Voici ta réponse complète, sans effet machine à écrire." />)

    expect(
      screen.getByText('Voici ta réponse complète, sans effet machine à écrire.'),
    ).toBeInTheDocument()
    // Aucun setInterval/setTimeout laissé actif (le hook ne doit pas démarrer de minuteur).
    expect(jest.getTimerCount()).toBe(0)
  })

  it('sans data-motion=reduce, un minuteur tourne (comportement machine à écrire normal)', () => {
    jest.useFakeTimers()
    document.documentElement.removeAttribute('data-motion')

    render(<YayeStreamingText text="Un texte assez long pour que l’effet machine à écrire soit visible." />)

    expect(jest.getTimerCount()).toBeGreaterThan(0)
  })

  it('ne plante pas hors de tout <A11yProvider> (page /jeune/yaye, hors du groupe (app))', () => {
    // Aucun provider React monté ici — seul le DOM (document.documentElement) est utilisé.
    expect(() => render(<YayeStreamingText text="Salut !" />)).not.toThrow()
  })

  it('poser data-motion=reduce APRÈS le montage coupe le minuteur en cours (MutationObserver)', async () => {
    jest.useFakeTimers()
    document.documentElement.removeAttribute('data-motion')
    render(<YayeStreamingText text="Un texte assez long pour que l’effet machine à écrire soit visible." />)
    expect(jest.getTimerCount()).toBeGreaterThan(0)

    await act(async () => {
      document.documentElement.dataset.motion = 'reduce'
      // Laisse le MutationObserver (callback en microtask) se déclencher, sous fake timers.
      await jest.advanceTimersByTimeAsync(0)
    })

    expect(jest.getTimerCount()).toBe(0)
  })
})
