'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { marquerPresenceEvenement } from '../actions'

/**
 * GUIC-474 — Bascule de présence d'un participant (fallback admin manuel du
 * marquage par badge). Présent ↔ Absent → `marquerPresenceEvenement`.
 */
export function PresenceToggle({
  evenementId,
  cjsUid,
  present,
}: {
  evenementId: string
  cjsUid: string
  present: boolean
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function toggle() {
    startTransition(async () => {
      try {
        await marquerPresenceEvenement(evenementId, cjsUid, !present)
        router.refresh()
      } catch {
        /* silencieux — l'UI reste dans l'état précédent */
      }
    })
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      aria-label={present ? 'Marquer absent' : 'Marquer présent'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11.5,
        fontWeight: 800,
        padding: '5px 10px',
        minHeight: 34,
        borderRadius: 8,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        background: 'var(--gj-surface)',
        color: present ? 'var(--gj-grey)' : 'var(--gj-green-ink)',
        border: `1.5px solid ${present ? 'var(--gj-line)' : 'var(--gj-green)'}`,
        opacity: pending ? 0.6 : 1,
      }}
    >
      <Icon name={present ? 'close' : 'check'} size={13} />
      {present ? 'Absent' : 'Présent'}
    </button>
  )
}
