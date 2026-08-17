'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { suggestionsPartenaire, promouvoirEmployeur } from '@/app/admin/partenaires/actions'
import type { SuggestionPartenaire } from '@/lib/partenaire-dedup'

/**
 * GUIC-705 — « Rattacher à un partenaire » : promeut un employeur curé (texte) en Organisation.
 * Suggère les partenaires existants (dédup) ; l'admin lie l'un d'eux OU crée « {libelle} » sans
 * compte. Jamais de création silencieuse.
 */
export function RattacherPartenaireModal({
  isOpen,
  onClose,
  opportuniteId,
  libelle,
  onDone,
}: {
  isOpen: boolean
  onClose: () => void
  opportuniteId: string
  libelle: string
  onDone: (message: string, ok: boolean) => void
}) {
  const [suggestions, setSuggestions] = useState<SuggestionPartenaire[] | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!isOpen) return
    setSuggestions(null)
    suggestionsPartenaire(libelle).then(setSuggestions).catch(() => setSuggestions([]))
  }, [isOpen, libelle])

  function rattacher(params: { organisationId?: string; nom?: string }, label: string) {
    startTransition(async () => {
      try {
        await promouvoirEmployeur({ opportuniteId, ...params })
        onDone(`Offre rattachée à « ${label} ».`, true)
        onClose()
      } catch {
        onDone('Rattachement impossible.', false)
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rattacher à un partenaire">
      <div className="flex flex-col gap-space-3">
        <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>
          Employeur détecté : <b style={{ color: 'var(--gj-ink)' }}>{libelle}</b>. Lie-le à un partenaire existant ou crée-le.
        </p>

        {suggestions === null ? (
          <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Recherche de partenaires similaires…</p>
        ) : suggestions.length > 0 ? (
          <div className="flex flex-col gap-[8px]">
            <div className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--gj-grey)' }}>Partenaires similaires</div>
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pending}
                onClick={() => rattacher({ organisationId: s.id }, s.nom)}
                className="flex items-center gap-[8px] text-left rounded-[10px] px-[12px] py-[9px]"
                style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }}
              >
                <b className="text-[13px]">{s.nom}</b>
                {s.estVerifie && <Icon name="check-circle" size={12} />}
                <span className="ml-auto text-[11.5px] font-bold" style={{ color: 'var(--gj-teal-deep)' }}>Lier</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucun partenaire similaire.</p>
        )}

        <div className="flex items-center justify-between gap-space-2 mt-space-2" style={{ borderTop: '1px solid var(--gj-line)', paddingTop: 12 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button type="button" variant="primary" disabled={pending} onClick={() => rattacher({ nom: libelle }, libelle)}>
            <Icon name="plus" size={14} /> Créer « {libelle} »
          </Button>
        </div>
      </div>
    </Modal>
  )
}
