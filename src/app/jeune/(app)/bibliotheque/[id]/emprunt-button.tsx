'use client'

import { useState } from 'react'
import { Button, Toast } from '@/components/ui'

interface Props {
  exemplaireId: string
  centreNom: string
}

type State = 'idle' | 'loading' | 'success' | 'error'

export function EmpruntButton({ exemplaireId, centreNom }: Props) {
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleEmprunt() {
    if (state !== 'idle') return
    setState('loading')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/bibliotheque/emprunts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ exemplaireId }),
      })
      const json = (await res.json()) as { data?: unknown; error?: string }

      if (!res.ok) {
        setState('error')
        setErrorMsg(json.error ?? 'Une erreur est survenue. Réessaie.')
        return
      }

      setState('success')
    } catch {
      setState('error')
      setErrorMsg('Impossible de contacter le serveur. Vérifie ta connexion.')
    }
  }

  if (state === 'success') {
    return (
      <div
        className="flex items-center gap-space-2 text-fs-200 font-bold rounded-gj-md px-space-3"
        style={{
          background: 'var(--gj-green-soft, #d1fae5)',
          color: 'var(--gj-green-ink, #1a6b3c)',
          minHeight: 'var(--tap-min)',
        }}
      >
        Emprunt initié — présente ton badge au centre {centreNom} pour finaliser.
      </div>
    )
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        loading={state === 'loading'}
        disabled={state !== 'idle'}
        onClick={() => void handleEmprunt()}
        aria-label={`Emprunter cet exemplaire au centre ${centreNom}`}
      >
        Emprunter
      </Button>

      {state === 'error' && errorMsg && (
        <Toast
          message={errorMsg}
          variant="danger"
          onClose={() => {
            setState('idle')
            setErrorMsg(null)
          }}
        />
      )}
    </>
  )
}
