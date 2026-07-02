'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { basculerStatutRecruteur } from './actions'

/** Active/suspend le compte recruteur (personne) depuis la fiche partenaire. */
export function RecruteurStatutButton({
  cjsUid,
  organisationId,
  actif,
  nom,
}: {
  cjsUid: string
  organisationId: string
  actif: boolean
  nom: string
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function toggle() {
    if (actif && !window.confirm(`Suspendre le compte recruteur « ${nom} » ?`)) return
    startTransition(async () => {
      try {
        await basculerStatutRecruteur(cjsUid, !actif, organisationId)
        router.refresh()
      } catch {
        /* silencieux */
      }
    })
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className="inline-flex items-center justify-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[40px] disabled:opacity-60"
      style={actif
        ? { background: 'var(--gj-surface)', color: 'var(--gj-red-ink)', border: '1.5px solid var(--gj-red)' }
        : { background: 'var(--gj-green, #2b9e54)', color: '#fff', border: 'none' }}
    >
      <Icon name={actif ? 'block' : 'check'} size={14} />
      {actif ? 'Suspendre le compte' : 'Réactiver le compte'}
    </button>
  )
}
