'use client'

/**
 * GUIC-133 — Zone de saisie d'un message (partagée recruteur/jeune).
 * Envoi via server action + `router.refresh()` (pas de websocket).
 */
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { envoyerMessage } from '@/lib/messagerie/actions'

export function Composer({ conversationId, accent = 'var(--gj-teal-deep, #0F766E)' }: { conversationId: string; accent?: string }) {
  const router = useRouter()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [pending, start] = useTransition()
  const [err, setErr] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const corps = ref.current?.value.trim()
    if (!corps) return
    start(async () => {
      try {
        await envoyerMessage(conversationId, corps)
        if (ref.current) ref.current.value = ''
        setErr(false)
        router.refresh()
      } catch {
        setErr(true)
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-[8px]">
      <textarea
        ref={ref} rows={1} required maxLength={5000} placeholder="Écrire un message…"
        className="flex-1 rounded-[10px] border-[1.5px] px-[12px] py-[10px] text-[14px] bg-white"
        style={{ borderColor: err ? 'var(--gj-red, #DC2626)' : 'var(--gj-line)', resize: 'none', minHeight: 44 }}
      />
      <button
        type="submit" disabled={pending}
        className="inline-flex items-center justify-center rounded-[10px] min-h-[44px] px-[18px] font-black text-[13px]"
        style={{ background: accent, color: '#fff', opacity: pending ? 0.6 : 1 }}
      >
        {pending ? '…' : 'Envoyer'}
      </button>
    </form>
  )
}
