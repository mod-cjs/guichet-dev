'use client'

/** GUIC-514 — Annule un entretien planifié (recruteur). */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { annulerEntretien } from './actions'

export function AnnulerButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState(false)

  function go() {
    start(async () => {
      try {
        await annulerEntretien(id)
        router.refresh()
      } catch {
        setErr(true)
      }
    })
  }

  return (
    <button type="button" onClick={go} disabled={pending} className="inline-flex items-center font-bold text-[12px] rounded-[9px] px-[12px] min-h-[36px]" style={{ color: 'var(--gj-red-ink, #B91C1C)', border: '1.5px solid var(--gj-red, #DC2626)', opacity: pending ? 0.6 : 1 }}>
      {err ? 'Réessayer' : pending ? '…' : 'Annuler'}
    </button>
  )
}
