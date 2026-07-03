'use client'

/**
 * GUIC-515 — Planifier un entretien depuis la fiche candidat (design v4 RecCandidate).
 * Réutilise l'action `planifierEntretien` avec la candidature déjà connue.
 */
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import { planifierEntretien, type PlanifierEntretienInput } from '../../entretiens/actions'

const MODES = [
  { value: 'Visio', label: 'Visio' },
  { value: 'Presentiel', label: 'Présentiel' },
  { value: 'Telephone', label: 'Téléphone' },
]

export function PlanifierEntretienInline({ candidatureId }: { candidatureId: string }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    const g = (k: string) => { const v = fd.get(k); return typeof v === 'string' ? v.trim() : '' }
    const payload = { candidatureId, dateHeure: g('dateHeure'), mode: g('mode') || 'Visio', lieu: g('lieu') } as PlanifierEntretienInput
    start(async () => {
      try {
        await planifierEntretien(payload)
        setToast({ msg: 'Entretien planifié — le candidat est notifié.', variant: 'success' })
        setOpen(false)
        router.refresh()
      } catch {
        setToast({ msg: 'Vérifiez la date.', variant: 'error' })
      }
    })
  }

  if (!open) {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-[7px] font-bold text-[13px] rounded-[10px] px-[16px] min-h-[44px]" style={{ color: 'var(--gj-blue-ink, #1A3FA8)', border: '1.5px solid var(--gj-blue, #1A4ED8)' }}>
          <Icon name="calendar" size={15} /> Planifier un entretien
        </button>
        {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
      </>
    )
  }

  return (
    <form ref={formRef} onSubmit={submit} className="w-full rounded-[12px] p-[14px] flex flex-col gap-[10px]" style={{ background: 'var(--gj-bg, #f6f8fa)', border: '1.5px solid var(--gj-line)' }}>
      <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Input name="dateHeure" label="Date et heure" type="datetime-local" required />
        <Select name="mode" label="Mode" required options={MODES} defaultValue="Visio" />
        <Input name="lieu" label="Lieu / lien" maxLength={500} placeholder="Adresse ou lien" />
      </div>
      <div className="flex items-center gap-[8px] justify-end">
        <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center font-bold text-[12.5px] rounded-[9px] px-[14px] min-h-[40px]" style={{ color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}>Annuler</button>
        <button type="submit" disabled={pending} className="inline-flex items-center font-black text-[12.5px] rounded-[9px] px-[16px] min-h-[40px]" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff', opacity: pending ? 0.6 : 1 }}>
          {pending ? '…' : 'Planifier'}
        </button>
      </div>
      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </form>
  )
}
