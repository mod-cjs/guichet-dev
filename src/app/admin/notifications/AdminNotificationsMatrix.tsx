'use client'

import { useMemo, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
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
    <div className="space-y-8">
      {groups.map(([module, rows]) => (
        <section key={module}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gj-yellow">
            {MODULE_LABEL[module] ?? module}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/60">
                  <th className="px-3 py-2 font-medium">Événement</th>
                  <th className="px-3 py-2 font-medium">Destinataire</th>
                  {NOTIFICATION_CHANNELS.map((canal) => (
                    <th key={canal} className="px-3 py-2 text-center font-medium">
                      {CHANNEL_LABEL[canal]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((cell) => (
                  <tr key={keyOf(cell)} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2">
                      <span className="text-white">{cell.label}</span>{' '}
                      {cell.critical && <Badge variant="red">critique</Badge>}
                      {cell.isOverride && <Badge variant="grey">personnalisé</Badge>}
                    </td>
                    <td className="px-3 py-2 text-white/70">{ROLE_LABEL[cell.role] ?? cell.role}</td>
                    {NOTIFICATION_CHANNELS.map((canal) => {
                      const on = cell.canaux.includes(canal)
                      return (
                        <td key={canal} className="px-3 py-2 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            aria-label={`${CHANNEL_LABEL[canal]} — ${cell.label} (${ROLE_LABEL[cell.role] ?? cell.role})`}
                            disabled={pending}
                            onClick={() => toggle(cell, canal)}
                            className={[
                              'inline-flex h-6 w-11 items-center rounded-full transition-colors',
                              on ? 'bg-gj-teal' : 'bg-white/15',
                              pending ? 'opacity-60' : 'cursor-pointer',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                                on ? 'translate-x-5' : 'translate-x-0.5',
                              ].join(' ')}
                            />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
