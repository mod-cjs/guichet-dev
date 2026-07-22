'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { setChannelPreference } from '@/lib/notifications/preferences'
import type { ChannelPreferenceView } from '@/lib/notifications/preferences'
import type { NotificationChannelId } from '@/lib/notifications/catalog'

const CHANNEL_META: Record<NotificationChannelId, { label: string; desc: string }> = {
  in_app: { label: 'Dans l’application', desc: 'Cloche et centre de notifications du Guichet.' },
  whatsapp: { label: 'WhatsApp', desc: 'Messages sur votre numéro WhatsApp lié.' },
  sms: { label: 'SMS', desc: 'Textos sur votre téléphone (frais opérateur possibles).' },
  email: { label: 'E-mail', desc: 'Messages sur votre adresse e-mail.' },
}

export function ChannelPreferencesClient({ initial }: { initial: ChannelPreferenceView[] }) {
  const [prefs, setPrefs] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)

  function toggle(view: ChannelPreferenceView) {
    const next = !view.consentGiven
    const prev = prefs
    setPrefs((ps) => ps.map((p) => (p.canal === view.canal ? { ...p, consentGiven: next, enabled: next } : p)))
    startTransition(async () => {
      try {
        await setChannelPreference(view.canal, { consentGiven: next, enabled: next })
        setToast({
          message: next ? `Canal ${CHANNEL_META[view.canal].label} activé.` : `Canal ${CHANNEL_META[view.canal].label} désactivé.`,
          variant: 'success',
        })
      } catch {
        setPrefs(prev)
        setToast({ message: 'Échec de l’enregistrement.', variant: 'danger' })
      }
    })
  }

  return (
    <ul className="divide-y divide-gj-border rounded-lg border border-gj-border">
      {prefs.map((view) => {
        const meta = CHANNEL_META[view.canal]
        return (
          <li key={view.canal} className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gj-ink">{meta.label}</span>
                {!view.requiresConsent && <Badge variant="teal">toujours actif</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-gj-grey">{meta.desc}</p>
            </div>

            {view.requiresConsent ? (
              <button
                type="button"
                role="switch"
                aria-checked={view.consentGiven}
                aria-label={`Recevoir par ${meta.label}`}
                disabled={pending}
                onClick={() => toggle(view)}
                className={[
                  'inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
                  view.consentGiven ? 'bg-gj-teal' : 'bg-gj-bg',
                  pending ? 'opacity-60' : 'cursor-pointer',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform',
                    view.consentGiven ? 'translate-x-5' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </button>
            ) : (
              <span aria-hidden className="text-sm text-gj-grey">Activé</span>
            )}
          </li>
        )
      })}
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </ul>
  )
}
