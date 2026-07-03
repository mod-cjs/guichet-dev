'use client'

/**
 * GUIC-514 — Formulaire de planification d'un entretien (recruteur).
 * Choix d'une candidature du recruteur + date/heure + mode + lieu/lien.
 */
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import { planifierEntretien, type PlanifierEntretienInput } from './actions'

const MODES = [
  { value: 'Visio', label: 'Visio' },
  { value: 'Presentiel', label: 'Présentiel' },
  { value: 'Telephone', label: 'Téléphone' },
]

export function PlanifierForm({ candidats }: { candidats: { id: string; label: string }[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)

  if (candidats.length === 0) {
    return (
      <div className="rounded-[14px] p-[16px] mb-5 text-[13px]" style={{ background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>
        Recevez d&apos;abord des candidatures pour planifier un entretien.
      </div>
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    const g = (k: string) => { const v = fd.get(k); return typeof v === 'string' ? v.trim() : '' }
    const payload = {
      candidatureId: g('candidatureId'),
      dateHeure: g('dateHeure'),
      mode: g('mode') || 'Visio',
      lieu: g('lieu'),
      notes: g('notes'),
    } as PlanifierEntretienInput

    start(async () => {
      try {
        await planifierEntretien(payload)
        setToast({ msg: 'Entretien planifié — le candidat est notifié.', variant: 'success' })
        setOpen(false)
        formRef.current?.reset()
        router.refresh()
      } catch {
        setToast({ msg: 'Vérifiez la date et le candidat.', variant: 'error' })
      }
    })
  }

  return (
    <div className="mb-5">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-[7px] font-black text-[13px] rounded-[10px] px-[18px] min-h-[44px]" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff' }}>
          <Icon name="plus" size={15} /> Planifier un entretien
        </button>
      ) : (
        <form ref={formRef} onSubmit={submit} className="rounded-[14px] p-[18px] flex flex-col gap-[12px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <h2 className="text-[14px] font-black" style={{ color: 'var(--gj-ink)' }}>Nouvel entretien</h2>
          <Select name="candidatureId" label="Candidat" required options={candidats.map((c) => ({ value: c.id, label: c.label }))} placeholder="Choisir un candidat…" />
          <div className="grid gap-[12px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Input name="dateHeure" label="Date et heure" type="datetime-local" required />
            <Select name="mode" label="Mode" required options={MODES} defaultValue="Visio" />
            <Input name="lieu" label="Lieu / lien" maxLength={500} placeholder="Adresse ou lien visio" />
          </div>
          <Textarea name="notes" label="Notes (optionnel)" rows={2} maxLength={2000} />
          <div className="flex items-center gap-[10px] justify-end">
            <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center font-bold text-[13px] rounded-[10px] px-[16px] min-h-[44px]" style={{ color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}>Annuler</button>
            <button type="submit" disabled={pending} className="inline-flex items-center font-black text-[13px] rounded-[10px] px-[20px] min-h-[44px]" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff', opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Planification…' : 'Planifier'}
            </button>
          </div>
        </form>
      )}
      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
