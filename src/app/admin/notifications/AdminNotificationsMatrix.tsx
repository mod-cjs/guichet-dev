'use client'

// GUIC-550 — Matrice admin des notifications, langage design v4 (admin-web2.jsx) :
// contenu clair, cartes blanches bordées gj-line, pills arrondis, toggles 42×24
// gj-teal / gj-line-strong. Une carte par (événement × rôle).

import { useMemo, useState, useTransition } from 'react'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { setEventChannels } from './actions'
import type { MatrixCell } from '@/lib/notifications/matrix'
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannelId,
} from '@/lib/notifications/catalog'

const CHANNEL_LABEL: Record<NotificationChannelId, string> = {
  in_app: 'App',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
}

const ROLE_LABEL: Record<string, string> = {
  beneficiaire: 'Bénéficiaire',
  recruteur: 'Recruteur',
  conseiller: 'Conseiller',
  admin: 'Admin',
}

const MODULE_LABEL: Record<string, string> = {
  m2: 'Comptes',
  m3: 'Opportunités',
  m4: 'Centres',
  m5: 'Agenda',
  m6: 'Ressources',
  m8: 'Admin',
  m9: 'Recruteur',
  m11: 'WhatsApp',
  m12: 'Yaye',
}

type CellKey = string
const keyOf = (c: Pick<MatrixCell, 'eventKey' | 'role'>): CellKey => `${c.eventKey}::${c.role}`

function Pill({ tone, children }: { tone: 'grey' | 'teal' | 'red'; children: React.ReactNode }) {
  const tones = {
    grey: 'bg-gj-bg text-gj-grey',
    teal: 'bg-gj-teal-soft text-gj-teal-deep',
    red: 'bg-gj-red-soft text-gj-red-ink',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function AdminNotificationsMatrix({ initial }: { initial: MatrixCell[] }) {
  const [cells, setCells] = useState<MatrixCell[]>(initial)
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)

  const groups = useMemo(() => {
    const byModule = new Map<string, MatrixCell[]>()
    for (const c of cells) {
      const list = byModule.get(c.module) ?? []
      list.push(c)
      byModule.set(c.module, list)
    }
    return [...byModule.entries()]
  }, [cells])

  function toggle(cell: MatrixCell, canal: NotificationChannelId) {
    const has = cell.canaux.includes(canal)
    const next = has ? cell.canaux.filter((c) => c !== canal) : [...cell.canaux, canal]
    // in_app d'un événement critique : on refuse de le couper (jamais silencieux).
    if (cell.critical && canal === 'in_app' && has) {
      setToast({ message: 'Événement critique : l’in-app reste toujours actif.', variant: 'danger' })
      return
    }

    const k = keyOf(cell)
    const prev = cells
    setCells((cs) =>
      cs.map((c) => (keyOf(c) === k ? { ...c, canaux: next, isOverride: true } : c)),
    )
    startTransition(async () => {
      try {
        await setEventChannels(cell.eventKey, cell.role, next, cell.actif)
        setToast({ message: 'Configuration enregistrée.', variant: 'success' })
      } catch {
        setCells(prev) // rollback optimiste
        setToast({ message: 'Échec de l’enregistrement.', variant: 'danger' })
      }
    })
  }

  return (
    <div className="space-y-7">
      {groups.map(([module, rows]) => (
        <section key={module}>
          <h2 className="mb-2.5 text-xs font-extrabold uppercase tracking-wide text-gj-grey">
            {MODULE_LABEL[module] ?? module}
          </h2>
          <div className="flex flex-col gap-2.5">
            {rows.map((cell) => (
              <div
                key={keyOf(cell)}
                className={`flex flex-col gap-3 rounded-[14px] border-[1.5px] border-gj-line bg-white p-4 sm:flex-row sm:items-center ${cell.actif ? '' : 'opacity-60'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-extrabold text-gj-ink">{cell.label}</span>
                    <Pill tone="grey">{ROLE_LABEL[cell.role] ?? cell.role}</Pill>
                    {cell.critical && <Pill tone="red">critique</Pill>}
                    {cell.isOverride && <Pill tone="teal">personnalisé</Pill>}
                  </div>
                  <div className="mt-1 text-[11.5px] text-gj-grey">{cell.eventKey}</div>
                </div>

                <div className="flex shrink-0 items-start gap-4">
                  {NOTIFICATION_CHANNELS.map((canal) => {
                    const on = cell.canaux.includes(canal)
                    return (
                      <div key={canal} className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`${CHANNEL_LABEL[canal]} — ${cell.label} (${ROLE_LABEL[cell.role] ?? cell.role})`}
                          disabled={pending}
                          onClick={() => toggle(cell, canal)}
                          className={`relative h-6 w-[42px] rounded-full transition-colors ${on ? 'bg-gj-teal' : 'bg-gj-line-strong'} ${pending ? 'opacity-60' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${on ? 'left-[20px]' : 'left-0.5'}`}
                          />
                        </button>
                        <span className="text-[10px] font-extrabold text-gj-grey">
                          {CHANNEL_LABEL[canal]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
