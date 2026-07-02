'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import type { TypeRessourceCentre } from '@prisma/client'
import { basculerActiveRessourceCentre, supprimerRessourceCentre } from '../../ressources-actions'
import { RessourceCentreFormModal, type RessourceCentreValues } from '../../RessourceCentreFormModal'

export interface RessourceCentreItem {
  id: string
  type: TypeRessourceCentre
  nom: string
  description: string | null
  capacite: number
  capaciteUnit: string | null
  dureeMinCreneauMin: number
  requiresJustif: boolean
  estActive: boolean
  reservationsCount: number
}

export interface AdminCentreRessourcesProps {
  centreId: string
  centreNom: string
  items: RessourceCentreItem[]
}

const TYPE_LABEL: Record<TypeRessourceCentre, string> = {
  Salle: 'Salle',
  Vehicule: 'Véhicule',
  Poste_info: 'Poste info',
  Equipement: 'Équipement',
  Atelier_recurrent: 'Atelier récurrent',
}

function Row({ item, onEdit, onResult }: {
  item: RessourceCentreItem
  onEdit: (r: RessourceCentreValues) => void
  onResult: (m: string, v: ToastVariant) => void
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function run(fn: () => Promise<unknown>, ok: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    startTransition(async () => {
      try {
        await fn()
        onResult(ok, 'success')
        router.refresh()
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        onResult(msg === 'RESSOURCE_NON_VIDE' ? 'Impossible : des réservations existent. Désactive-la plutôt.' : 'Action impossible.', 'danger')
      }
    })
  }

  return (
    <div className="rounded-[14px] p-[16px] flex items-start gap-[12px] flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }}>
            {TYPE_LABEL[item.type]}
          </span>
          {!item.estActive && (
            <span className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-line)', color: 'var(--gj-grey)' }}>
              Inactive
            </span>
          )}
          <span className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>{item.nom}</span>
        </div>
        <p className="text-[12.5px] mt-[4px]" style={{ color: 'var(--gj-grey)' }}>
          Capacité {item.capacite}{item.capaciteUnit ? ` ${item.capaciteUnit}` : ''} · créneau {item.dureeMinCreneauMin} min
          {item.requiresJustif ? ' · justificatif requis' : ''}
        </p>
      </div>

      <div className="flex items-center gap-[8px] flex-wrap">
        <button type="button" onClick={() => onEdit(item)} className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px]" style={{ background: 'var(--gj-surface)', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-teal)' }}>
          <Icon name="settings" size={14} /> Éditer
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => basculerActiveRessourceCentre(item.id, !item.estActive), item.estActive ? `« ${item.nom} » désactivée.` : `« ${item.nom} » activée.`)} className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px] disabled:opacity-60" style={{ background: 'var(--gj-surface)', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}>
          <Icon name={item.estActive ? 'eye-off' : 'eye'} size={14} /> {item.estActive ? 'Désactiver' : 'Activer'}
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => supprimerRessourceCentre(item.id), `« ${item.nom} » supprimée.`, `Supprimer « ${item.nom} » ?`)} className="inline-flex items-center justify-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px] disabled:opacity-60" style={{ background: 'var(--gj-surface)', color: 'var(--gj-red-ink)', border: '1.5px solid var(--gj-red)' }}>
          <Icon name="close" size={14} /> Supprimer
        </button>
      </div>
    </div>
  )
}

/** AdminCentreRessources (GUIC-473) — CRUD des ressources réservables d'un centre. */
export function AdminCentreRessources({ centreId, centreNom, items }: AdminCentreRessourcesProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RessourceCentreValues | undefined>(undefined)
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)

  function openCreate() { setEditing(undefined); setModalOpen(true) }
  function openEdit(r: RessourceCentreValues) { setEditing(r); setModalOpen(true) }

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Link href="/admin/centres" className="inline-flex items-center gap-[6px] text-fs-200 font-bold text-gj-teal-deep hover:underline mb-space-3">
          <Icon name="chevron-left" size={15} /> Retour aux centres
        </Link>

        <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Ressources — {centreNom}</h1>
            <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>{items.length} ressource{items.length > 1 ? 's' : ''} réservable{items.length > 1 ? 's' : ''}</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-[6px] font-black text-[13px] rounded-[10px] px-[16px] py-[10px] min-h-[44px]" style={{ background: 'var(--gj-teal)', color: '#fff' }}>
            <Icon name="plus" size={15} /> Nouvelle ressource
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
            <p className="text-[14px] font-bold">Aucune ressource réservable pour ce centre.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {items.map((item) => <Row key={item.id} item={item} onEdit={openEdit} onResult={(m, v) => setFeedback({ message: m, variant: v })} />)}
          </div>
        )}
      </div>

      <RessourceCentreFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} centreId={centreId} ressource={editing} />
      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
