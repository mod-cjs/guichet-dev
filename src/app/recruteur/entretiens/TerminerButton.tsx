'use client'

/** GUIC-515 — marque un entretien comme terminé (recruteur). */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { terminerEntretien } from './actions'

export function TerminerButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState(false)

  return (
    <button
      type="button"
      onClick={() => start(async () => { try { await terminerEntretien(id); router.refresh() } catch { setErr(true) } })}
      disabled={pending}
      className="inline-flex items-center font-bold text-[12px] rounded-[9px] px-[12px] min-h-[36px]"
      style={{ color: 'var(--gj-green-ink, #0F6B45)', border: '1.5px solid var(--gj-green, #16A34A)', opacity: pending ? 0.6 : 1 }}
    >
      {err ? 'Réessayer' : pending ? '…' : 'Terminé'}
    </button>
  )
}
