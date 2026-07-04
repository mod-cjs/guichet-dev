'use client'

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
      <span aria-hidden style={{ width: 44, height: 26, borderRadius: 13, flexShrink: 0, background: on ? 'var(--gj-teal-deep)' : 'var(--gj-line)', position: 'relative', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
      </span>
    </button>
  )
}

export function ParametresNotifForm({ notifActivite, notifMessages }: { notifActivite: boolean; notifMessages: boolean }) {
  const router = useRouter()
  const [activite, setActivite] = useState(notifActivite)
  const [msg, setMsg] = useState(notifMessages)
  const [pending, start] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)

  function save() {
    start(async () => {
      const res = await modifierPreferencesNotif({ notifActivite: activite, notifMessages: msg })
      if (res.error) setToast({ msg: res.error.message, variant: 'error' })
      else { setToast({ msg: 'Préférences enregistrées.', variant: 'success' }); router.refresh() }
    })
  }

  return (
    <div className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
      <h2 className="font-black text-color-text-primary m-0" style={{ fontSize: 15, marginBottom: 6 }}>Notifications</h2>
      <div style={{ borderBottom: '1px solid var(--gj-line)' }}>
        <Toggle on={activite} onChange={setActivite} label="Activité du centre" hint="M'alerter des nouvelles demandes de réservation et rappels de RDV." />
      </div>
      <Toggle on={msg} onChange={setMsg} label="Messages" hint="M'alerter quand je reçois un message d'un bénéficiaire." />
      <div className="flex justify-end mt-3">
        <button type="button" onClick={save} disabled={pending} className="inline-flex items-center font-black text-[13px] rounded-[10px] px-[18px] min-h-[44px]" style={{ background: 'var(--gj-teal-deep)', color: '#fff', opacity: pending ? 0.6 : 1 }}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
