'use client'

/**
 * GUIC-133 — Bouton « Contacter » sur la fiche candidature (recruteur).
 * Ouvre/crée la conversation ancrée à la candidature puis navigue vers le thread.
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { contacterCandidat } from '@/lib/messagerie/actions'

export function ContacterButton({ candidatureId }: { candidatureId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState(false)

  function go() {
    start(async () => {
      try {
        const { id } = await contacterCandidat(candidatureId)
        router.push(`/recruteur/messagerie/${id}`)
      } catch {
        setErr(true)
      }
    })
  }

  return (
    <button
      type="button" onClick={go} disabled={pending}
      className="inline-flex items-center gap-[7px] font-black text-[13px] rounded-[10px] px-[18px] min-h-[44px]"
      style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff', opacity: pending ? 0.6 : 1 }}
    >
      <Icon name="chat" size={15} /> {err ? 'Réessayer' : 'Contacter'}
    </button>
  )
}
