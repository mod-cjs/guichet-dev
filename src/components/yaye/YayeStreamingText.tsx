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
export function YayeStreamingText({ text, done }: { text: string; done?: boolean }) {
  const [shown, setShown] = useState(0)
  const textRef = useRef(text)
  textRef.current = text
  const endRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setShown(s => {
        const target = textRef.current.length
        if (s >= target) return s
        const step = Math.max(1, Math.ceil((target - s) / 24)) // backlog vidé en ~24 frames
        return Math.min(target, s + step)
      })
    }, 16)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [shown])

  const visible = text.slice(0, shown)
  const caretVisible = !done || shown < text.length

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
