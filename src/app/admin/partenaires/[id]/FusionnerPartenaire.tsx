'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { rechercherOrganisations, fusionnerOrganisations, type OrganisationTrouvee } from '@/app/admin/partenaires/actions'

/**
 * GUIC-706 (Q5) — fusionner CE partenaire (source) dans un autre (cible canonique).
 * Action DESTRUCTIVE : la source est supprimée après réaffectation des offres + membres.
 * Recherche de la cible → confirmation explicite → redirection vers la cible.
 */
export function FusionnerPartenaire({ sourceId, sourceNom }: { sourceId: string; sourceNom: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [resultats, setResultats] = useState<OrganisationTrouvee[] | null>(null)
  const [cible, setCible] = useState<OrganisationTrouvee | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function chercher(value: string) {
    setQ(value)
    setCible(null)
    if (value.trim().length < 2) {
      setResultats(null)
      return
    }
    startTransition(async () => {
      try {
        setResultats(await rechercherOrganisations(value, sourceId))
      } catch {
        setResultats([])
      }
    })
  }

  function confirmer() {
    if (!cible) return
    startTransition(async () => {
      try {
        await fusionnerOrganisations({ sourceId, cibleId: cible.id })
        router.push(`/admin/partenaires/${cible.id}`)
        router.refresh()
      } catch {
        setErreur('Fusion impossible. Réessayez.')
      }
    })
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[12px] py-[7px]"
        style={{ background: 'var(--gj-surface)', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}
      >
        <Icon name="settings" size={14} /> Fusionner dans un autre partenaire
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Fusionner ce partenaire">
        <div className="flex flex-col gap-space-3">
          <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>
            <b style={{ color: 'var(--gj-ink)' }}>{sourceNom}</b> sera absorbé : ses offres et ses membres passent au
            partenaire choisi, puis <b style={{ color: 'var(--gj-red-ink)' }}>il est supprimé (irréversible)</b>.
          </p>

          <input
            type="search"
            value={q}
            onChange={(e) => chercher(e.target.value)}
            placeholder="Rechercher le partenaire à conserver…"
            className="w-full rounded-[10px] px-[12px] py-[10px] text-[13.5px]"
            style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }}
          />

          {cible ? (
            <div className="rounded-[10px] p-[12px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-teal-deep)' }}>
              <p className="text-[13px]" style={{ color: 'var(--gj-ink)' }}>
                Conserver <b>{cible.nom}</b> et y fusionner <b>{sourceNom}</b> ?
              </p>
            </div>
          ) : resultats === null ? (
            <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Saisis au moins 2 caractères.</p>
          ) : resultats.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucun partenaire trouvé.</p>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {resultats.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={pending}
                  onClick={() => setCible(o)}
                  className="flex items-center gap-[8px] text-left rounded-[10px] px-[12px] py-[9px]"
                  style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }}
                >
                  <b className="text-[13.5px]">{o.nom}</b>
                  {o.estVerifie && <Icon name="check-circle" size={12} />}
                  <span className="ml-auto text-[11.5px] font-bold" style={{ color: 'var(--gj-teal-deep)' }}>Choisir</span>
                </button>
              ))}
            </div>
          )}

          {erreur && <p className="text-[12.5px] font-bold" style={{ color: 'var(--gj-red-ink)' }}>{erreur}</p>}

          <div className="flex items-center justify-between gap-space-2 mt-space-2" style={{ borderTop: '1px solid var(--gj-line)', paddingTop: 12 }}>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Annuler</Button>
            <Button type="button" variant="danger" disabled={pending || !cible} onClick={confirmer}>
              <Icon name="settings" size={14} /> Fusionner
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
