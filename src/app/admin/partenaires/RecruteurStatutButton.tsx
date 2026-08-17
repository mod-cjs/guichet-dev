'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { changerStatutUtilisateur } from '@/app/admin/utilisateurs/actions'

/**
 * Active/suspend le COMPTE recruteur (personne) depuis la fiche partenaire.
 * Découplage org ≠ compte : le statut d'une PERSONNE passe par l'unique action
 * canonique `changerStatutUtilisateur` (espace Utilisateurs). La suspension du
 * PARTENAIRE (masque ses offres) est un levier distinct (`basculerStatutOrganisation`).
 */
export function RecruteurStatutButton({
  cjsUid,
  actif,
  nom,
}: {
  cjsUid: string
  actif: boolean
  nom: string
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function toggle() {
    if (actif && !window.confirm(`Suspendre le compte recruteur « ${nom} » ?`)) return
    startTransition(async () => {
      const res = await changerStatutUtilisateur(cjsUid, actif ? 'inactif' : 'actif')
      if (res.ok) router.refresh()
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
