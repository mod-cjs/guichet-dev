'use client'

import { useEffect, useRef } from 'react'
import { useA11y } from './A11yProvider'

const GUIDE_HEIGHT = 38

/** Zones considérées lisibles par la lecture vocale (mêmes familles que v4). */
const READABLE_SELECTOR = 'button, a, label, h1, h2, h3, h4, p, li'

/** Lit un texte via la voix de l'appareil (fr-FR — décision PO GUIC-658). */
function speak(text: string) {
  if (!('speechSynthesis' in window) || !text) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 320))
    utterance.lang = 'fr-FR'
    utterance.rate = 0.98
    window.speechSynthesis.speak(utterance)
  } catch {
    // voix indisponible — silencieux, l'affordance visuelle reste
  }
}

/**
 * GUIC-658 — Gadgets d'accessibilité phase 2, montés dans le layout jeune
 * sous le A11yProvider. Sans réglage actif, ne rend rien et n'attache
 * aucun écouteur — zéro coût pour les utilisateurs qui n'ont rien activé.
 *
 * - Guide de lecture : règle horizontale `#gj-a11y-guide` (styles dans
 *   tokens.css, affichée via :root[data-guide="on"]) qui suit la souris.
 * - Lecture vocale : clic sur une zone lisible → lecture TTS du texte.
 *   L'écouteur est en capture et ne bloque rien : liens et boutons
 *   continuent de fonctionner normalement.
 */
export function A11yGadgets() {
  const { prefs } = useA11y()
  const guideRef = useRef<HTMLDivElement | null>(null)

  // Guide : suivre la souris (centrage vertical sur le curseur).
  useEffect(() => {
    if (!prefs.guide) return
    const onMove = (e: MouseEvent) => {
      const bar = guideRef.current
      if (bar) bar.style.top = `${e.clientY - GUIDE_HEIGHT / 2}px`
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [prefs.guide])

  // Lecture vocale : clic (capture) sur la zone lisible la plus proche.
  useEffect(() => {
    if (!prefs.voice) return
    const onClick = (e: Event) => {
      const target = e.target as Element | null
      const el = target?.closest?.(READABLE_SELECTOR)
      if (!el) return
      const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ')
      if (text) speak(text)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [prefs.voice])

  // Arrêter toute lecture en cours quand le réglage est coupé / au démontage.
  useEffect(() => {
    if (prefs.voice) return
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // rien à annuler
      }
    }
  }, [prefs.voice])

  if (!prefs.guide && !prefs.voice) return null

  return prefs.guide ? (
    <div id="gj-a11y-guide" ref={guideRef} aria-hidden />
  ) : null
}
