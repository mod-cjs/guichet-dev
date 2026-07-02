'use client'

/**
 * GUIC-513 — Préférences de notification recruteur (toggles).
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { modifierPreferencesNotif } from './actions'

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on} className="w-full flex items-center gap-3 text-left" style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: '10px 0' }}>
      <div className="flex-1">
        <div className="text-[13.5px] font-bold" style={{ color: 'var(--gj-ink)' }}>{label}</div>
        <div className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>{hint}</div>
      </div>
      <span aria-hidden style={{ width: 44, height: 26, borderRadius: 13, flexShrink: 0, background: on ? 'var(--gj-blue, #1A4ED8)' : 'var(--gj-line)', position: 'relative', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
      </span>
    </button>
  )
}

export function ParametresForm({ notifCandidatures, notifMessages }: { notifCandidatures: boolean; notifMessages: boolean }) {
  const router = useRouter()
  const [candid, setCandid] = useState(notifCandidatures)
  const [msg, setMsg] = useState(notifMessages)
  const [pending, start] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)

  function save() {
    start(async () => {
      try {
        await modifierPreferencesNotif({ notifCandidatures: candid, notifMessages: msg })
        setToast({ msg: 'Préférences enregistrées.', variant: 'success' })
        router.refresh()
      } catch {
        setToast({ msg: "Échec de l'enregistrement.", variant: 'error' })
      }
    })
  }

  return (
    <div>
      <div style={{ borderBottom: '1px solid var(--gj-line)' }}>
        <Toggle on={candid} onChange={setCandid} label="Nouvelles candidatures" hint="M'alerter quand un jeune postule à une de mes offres." />
      </div>
      <Toggle on={msg} onChange={setMsg} label="Messages" hint="M'alerter quand je reçois un message d'un candidat." />
      <div className="flex justify-end mt-3">
        <button type="button" onClick={save} disabled={pending} className="inline-flex items-center font-black text-[13px] rounded-[10px] px-[18px] min-h-[44px]" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff', opacity: pending ? 0.6 : 1 }}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
