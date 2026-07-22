'use client'

/**
 * GUIC-647 — Zone repliée « Refusées (n) » sous le kanban.
 * Les refusées sont hors colonnes/total ; chaque ligne peut être réintégrée
 * dans le pipeline actif (statut Vue, colonne Reçues) en cas d'erreur.
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { reintegrerCandidature } from './actions'
import type { PipelineCard } from '@/lib/loaders/recruteur'

function frDate(iso: string) { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }

export function RefuseesZone({ refusees }: { refusees: PipelineCard[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [enCours, setEnCours] = useState<string | null>(null)

  if (refusees.length === 0) return null

  function reintegrer(id: string) {
    setEnCours(id)
    start(async () => {
      try { await reintegrerCandidature(id); router.refresh() } catch { /* noop */ } finally { setEnCours(null) }
    })
  }

  return (
    <details className="mt-5 rounded-[14px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      <summary className="flex items-center gap-[8px] px-[14px] py-[12px] text-[13px] font-black list-none" style={{ color: 'var(--gj-grey)', cursor: 'pointer' }}>
        <Icon name="block" size={14} />
        Refusées ({refusees.length})
        <span className="text-[11px] font-bold ml-auto inline-flex items-center gap-[4px]">
          <Icon name="chevron-down" size={13} /> hors pipeline
        </span>
      </summary>
      <ul className="m-0 p-[10px] pt-0 list-none flex flex-col gap-[8px]">
        {refusees.map((c) => (
          <li key={c.id} className="flex items-center gap-[10px] rounded-[11px] px-[12px] py-[10px] flex-wrap" style={{ background: '#fff', border: '1px solid var(--gj-line)' }}>
            <div className="flex-1 min-w-[160px]">
              <a href={`/recruteur/candidatures/${c.id}`} className="text-[13px] font-black no-underline" style={{ color: 'var(--gj-ink)' }}>{c.prenom} {c.nom}</a>
              <div className="text-[11px]" style={{ color: 'var(--gj-grey)' }}>{c.offreTitre} · {frDate(c.soumiseA)}</div>
            </div>
            <button
              type="button"
              disabled={pending && enCours === c.id}
              onClick={() => reintegrer(c.id)}
              className="inline-flex items-center gap-[6px] font-bold text-[12px] rounded-[9px] px-[12px] min-h-[36px]"
              style={{ background: '#fff', color: 'var(--gj-blue-ink, #1A3FA8)', border: '1.5px solid var(--gj-blue, #1A4ED8)', cursor: 'pointer', opacity: pending && enCours === c.id ? 0.6 : 1 }}
            >
              <Icon name="arrow-up" size={13} /> Réintégrer
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
