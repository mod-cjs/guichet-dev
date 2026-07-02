'use client'

/**
 * GUIC-485 — Boutons de décision recruteur sur une candidature (Retenir / Refuser).
 * « Vue » est appliqué automatiquement à l'ouverture ; on ne propose que les décisions.
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { changerStatutCandidature } from '../actions'
import type { StatutCandidature } from '@prisma/client'

export function StatutActions({ id, statut }: { id: string; statut: StatutCandidature }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)

  function decide(next: 'Retenue' | 'Refusee') {
    start(async () => {
      try {
        await changerStatutCandidature(id, next)
        setToast({ msg: next === 'Retenue' ? 'Candidat retenu.' : 'Candidature refusée.', variant: 'success' })
        router.refresh()
      } catch {
        setToast({ msg: 'Action impossible. Réessayez.', variant: 'error' })
      }
    })
  }

  const retenu = statut === 'Retenue'
  const refuse = statut === 'Refusee'

  return (
    <div className="flex items-center gap-[10px] flex-wrap">
      <button
        type="button" onClick={() => decide('Retenue')} disabled={pending || retenu} aria-pressed={retenu}
        className="inline-flex items-center gap-[7px] font-black text-[13px] rounded-[10px] px-[18px] min-h-[44px]"
        style={{ background: retenu ? 'var(--gj-green, #16A34A)' : 'var(--gj-green-soft, #E6F6EE)', color: retenu ? '#fff' : 'var(--gj-green-ink, #0F6B45)', border: '1.5px solid var(--gj-green, #16A34A)', opacity: pending ? 0.6 : 1 }}
      >
        <Icon name="check-circle" size={15} /> {retenu ? 'Retenu' : 'Retenir'}
      </button>
      <button
        type="button" onClick={() => decide('Refusee')} disabled={pending || refuse} aria-pressed={refuse}
        className="inline-flex items-center gap-[7px] font-black text-[13px] rounded-[10px] px-[18px] min-h-[44px]"
        style={{ background: refuse ? 'var(--gj-red, #DC2626)' : 'var(--gj-red-soft, #FDECEC)', color: refuse ? '#fff' : 'var(--gj-red-ink, #B91C1C)', border: '1.5px solid var(--gj-red, #DC2626)', opacity: pending ? 0.6 : 1 }}
      >
        <Icon name="close" size={15} /> {refuse ? 'Refusé' : 'Refuser'}
      </button>
      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
