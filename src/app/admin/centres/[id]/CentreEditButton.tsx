'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { CentreFormModal, type CentreFormValues } from '../CentreFormModal'
import type { ProgrammeOption } from '@/components/admin/ProgrammesField'

/**
 * Bouton « Éditer la fiche » de l'en-tête de la fiche Centre (GUIC-687, fidélité maquette).
 * Client island : ouvre la CentreFormModal préremplie ; rafraîchit la page au succès.
 */
export function CentreEditButton({ centre, programmes = [] }: { centre: CentreFormValues; programmes?: ProgrammeOption[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0, background: 'var(--gj-surface)', color: 'var(--gj-ink)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--gj-edge)' }}
      >
        <Icon name="settings" size={14} /> Éditer la fiche
      </button>
      {open && (
        <CentreFormModal
          isOpen
          onClose={() => setOpen(false)}
          centre={centre}
          programmes={programmes}
          onSuccess={() => { setOpen(false); router.refresh() }}
        />
      )}
    </>
  )
}
