'use client'

import { useState } from 'react'

// Pouce 👍/👎 par message Yaye (GUIC-435, jalon B, couche 5).
// Boutons texte accessibles (pas d'icône pouce dans le sprite). Fail-soft :
// un échec réseau n'altère pas la conversation, on remercie quand même l'utilisateur.

interface Props {
  sessionId: string
  tourIndex: number
}

type Etat = 'idle' | 'envoi' | 'merci'

export function YayeFeedback({ sessionId, tourIndex }: Props) {
  const [etat, setEtat] = useState<Etat>('idle')

  const envoyer = async (note: 1 | -1) => {
    if (etat !== 'idle') return
    setEtat('envoi')
    try {
      await fetch('/api/ia/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, tourIndex, note }),
      })
    } catch {
      // Fail-soft : on remercie tout de même, le feedback est secondaire.
    } finally {
      setEtat('merci')
    }
  }

  if (etat === 'merci') {
    return <span className="text-fs-100 text-color-text-secondary">Merci pour ton retour.</span>
  }

  return (
    <div className="flex items-center gap-space-2 text-fs-100 text-color-text-secondary">
      <span>Cette réponse t&apos;a aidé ?</span>
      <button
        type="button"
        onClick={() => envoyer(1)}
        disabled={etat === 'envoi'}
        aria-label="Réponse utile"
        className="px-space-2 py-[2px] rounded-gj-pill border border-gj-line bg-white cursor-pointer hover:border-gj-teal-deep disabled:opacity-50"
      >
        Utile
      </button>
      <button
        type="button"
        onClick={() => envoyer(-1)}
        disabled={etat === 'envoi'}
        aria-label="Réponse pas utile"
        className="px-space-2 py-[2px] rounded-gj-pill border border-gj-line bg-white cursor-pointer hover:border-gj-red disabled:opacity-50"
      >
        Pas utile
      </button>
    </div>
  )
}
