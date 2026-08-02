'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Rendu « machine à écrire » du texte streamé de Yaye (#réponse interactive).
 * - Cadence LISSÉE : Groq envoie par paquets irréguliers ; on révèle les caractères
 *   à un rythme régulier (vide le backlog sur ~0,4 s) → écriture fluide, pas de saccade.
 * - Curseur clignotant tant que l'écriture n'est pas finie.
 * - Auto-scroll : suit le caret au fil de l'écriture.
 *
 * `text` = texte cumulé jusqu'ici (croît à chaque token) ; `done` = flux terminé.
 */
/** Vrai si l'attribut `data-motion="reduce"` est posé sur `<html>` — réglage
 *  applicatif de `/jeune/accessibilite` (cf. `A11yProvider` + script anti-FOUC
 *  du layout `/jeune/(app)`). Lu directement sur le DOM (jamais via un contexte
 *  React) : cette fonction doit rester correcte même hors de tout provider —
 *  ex. `/jeune/yaye` (page fullscreen) n'est PAS montée sous `A11yProvider`. */
function readDataMotionReduce(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.dataset.motion === 'reduce'
}

/**
 * True si l'utilisateur a demandé la réduction des animations — préférence OS/
 * navigateur (`prefers-reduced-motion`) OU réglage applicatif Guichet
 * (`data-motion="reduce"` sur `<html>`). L'UNE OU L'AUTRE suffit (règle v5 NON
 * NÉGOCIABLE : « animations réduites » doit couper les MINUTERIES JS, pas
 * seulement l'animation CSS).
 *
 * Choix technique : `MutationObserver` sur `<html data-motion>` plutôt qu'un
 * contexte React (`useA11y`) — fonctionne PARTOUT, avec ou sans `<A11yProvider>`
 * au-dessus (le hook ne doit jamais planter ni rester figé faute de provider),
 * et réagit immédiatement si le réglage change pendant que Yaye répond.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => readDataMotionReduce())
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    const recompute = () => setReduced(readDataMotionReduce() || !!mq?.matches)
    recompute()
    mq?.addEventListener('change', recompute)
    const observer = new MutationObserver(recompute)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    return () => {
      mq?.removeEventListener('change', recompute)
      observer.disconnect()
    }
  }, [])
  return reduced
}

export function YayeStreamingText({ text, done }: { text: string; done?: boolean }) {
  const reducedMotion = usePrefersReducedMotion()
  const [shown, setShown] = useState(0)
  const textRef = useRef(text)
  textRef.current = text
  const endRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    // Reduced motion : pas d'effet machine à écrire (le timer n'est pas couvert par
    // les règles CSS reduced-motion) → on révèle tout le texte d'un coup.
    if (reducedMotion) return
    const id = setInterval(() => {
      setShown(s => {
        const target = textRef.current.length
        if (s >= target) return s
        const step = Math.max(1, Math.ceil((target - s) / 24)) // backlog vidé en ~24 frames
        return Math.min(target, s + step)
      })
    }, 16)
    return () => clearInterval(id)
  }, [reducedMotion])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [shown])

  const visible = reducedMotion ? text : text.slice(0, shown)
  const caretVisible = !reducedMotion && (!done || shown < text.length)

  return (
    <span className="whitespace-pre-wrap break-words" data-testid="yaye-streaming">
      <style>{`@keyframes yaye-caret{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>
      {visible}
      {caretVisible && (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            marginLeft: 1,
            color: 'var(--gj-teal-deep)',
            fontWeight: 700,
            animation: 'yaye-caret 1s step-end infinite',
          }}
        >
          ▍
        </span>
      )}
      <span ref={endRef} />
    </span>
  )
}
