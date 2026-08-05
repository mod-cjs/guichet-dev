'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { SourceFormModal, type TypeOption } from './SourceFormModal'
import { LIBELLES_FREQUENCE } from './libelles'
import { lancerCollecte } from './actions'
import type { SourceRow, SanteSource } from '@/lib/loaders/admin-sources'

interface SourcesAdminTableProps {
  sources: SourceRow[]
  types: TypeOption[]
  nbActives: number
  nbEnEchec: number
}

const SANTE: Record<SanteSource, { label: string; bg: string; fg: string }> = {
  ok: { label: 'OK', bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' },
  partiel: { label: 'Partiel', bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
  echec: { label: 'Échec', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
  jamais: { label: 'Jamais', bg: 'var(--gj-line)', fg: 'var(--gj-grey)' },
}

async function messageErreur(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return body?.error?.message ?? fallback
}

export function SourcesAdminTable({ sources, types, nbActives, nbEnEchec }: SourcesAdminTableProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editSource, setEditSource] = useState<SourceRow | undefined>(undefined)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [, startTransition] = useTransition()

  const onResult = (message: string, variant: ToastVariant) => setFeedback({ message, variant })

  function collecter(sourceId?: string) {
    setBusyId(sourceId ?? 'all')
    startTransition(async () => {
      try {
        const r = await lancerCollecte(sourceId)
        if (r.ignore) onResult('Une collecte est déjà en cours — réessaie dans un instant.', 'warning')
        else onResult(`Collecte terminée — ${r.nbNouveautes} nouveauté${r.nbNouveautes > 1 ? 's' : ''} sur ${r.sourcesTraitees} source${r.sourcesTraitees > 1 ? 's' : ''}.`, 'success')
        router.refresh()
      } catch {
        onResult('La collecte a échoué — réessaie.', 'danger')
      } finally {
        setBusyId(null)
      }
    })
  }
  function toggleActif(s: SourceRow) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/sources-veille/${s.id}`, {
          method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actif: !s.actif }),
        })
        if (!res.ok) { onResult(await messageErreur(res, 'Changement de statut impossible.'), 'danger'); return }
        router.refresh()
      } catch { onResult('Réseau indisponible.', 'danger') }
    })
  }
  function handleDelete(s: SourceRow) {
    if (!window.confirm(`Supprimer la source « ${s.nom} » ? Le robot cessera de la surveiller.`)) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/sources-veille/${s.id}`, { method: 'DELETE' })
        if (!res.ok) { onResult(await messageErreur(res, 'Suppression impossible.'), 'danger'); return }
        router.refresh()
      } catch { onResult('Réseau indisponible.', 'danger') }
    })
  }

  const btn = (bg: string, fg: string): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9,
    fontWeight: 800, fontSize: 12.5, cursor: 'pointer', border: 0, background: bg, color: fg,
  })

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div className="flex items-end justify-between flex-wrap gap-[12px] mb-[14px]">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>Sources de veille</h1>
            <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: '3px 0 0' }}>
              {nbActives} active{nbActives > 1 ? 's' : ''}{nbEnEchec ? ` · ${nbEnEchec} en échec` : ''} — surveillées par le robot ; rien n’est publié sans validation.
            </p>
          </div>
          <div className="flex gap-[8px]">
            <button type="button" onClick={() => collecter()} disabled={busyId !== null} style={btn('var(--gj-green)', '#08130E')}>
              <Icon name="arrow-up" size={15} /> {busyId === 'all' ? 'Collecte…' : 'Lancer la collecte'}
            </button>
            <button type="button" onClick={() => { setEditSource(undefined); setModalOpen(true) }} style={btn('var(--gj-teal-deep)', '#fff')}>
              <Icon name="plus" size={15} /> Nouvelle source
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--gj-surface)', borderRadius: 14, border: '1.5px solid var(--gj-line)', overflow: 'hidden' }}>
          {sources.length === 0 && (
            <p style={{ padding: '28px 16px', fontSize: 13.5, color: 'var(--gj-grey)', margin: 0 }}>
              Aucune source déclarée. Ajoute un premier site à surveiller avec « Nouvelle source ».
            </p>
          )}
          {sources.map((s) => {
            const st = SANTE[s.sante]
            return (
              <div key={s.id} className="flex items-center gap-[12px] flex-wrap" style={{ padding: '13px 16px', borderBottom: '1.5px solid var(--gj-line)' }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--gj-ink)', fontSize: 14 }}>{s.nom}</div>
                  <div style={{ fontSize: 12, color: 'var(--gj-grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</div>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--gj-grey)', minWidth: 84 }}>{LIBELLES_FREQUENCE[s.frequence] ?? s.frequence}</span>
                <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: st.bg, color: st.fg }}>{st.label}</span>
                <span style={{ fontSize: 12, color: 'var(--gj-grey)', minWidth: 150 }}>
                  {s.derniereCollecteLabel}{s.nbNouveautes ? ` · ${s.nbNouveautes} nouv.` : ''}
                </span>
                <button type="button" onClick={() => toggleActif(s)} aria-label={s.actif ? `Désactiver ${s.nom}` : `Activer ${s.nom}`} style={{ border: 0, background: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12.5, color: s.actif ? 'var(--gj-teal-deep)' : 'var(--gj-grey)' }}>
                  {s.actif ? 'Active' : 'Inactive'}
                </button>
                <div className="flex items-center gap-[6px] ml-auto">
                  <button type="button" onClick={() => collecter(s.id)} disabled={busyId !== null} aria-label={`Lancer la collecte de ${s.nom}`} title="Lancer la collecte" style={{ ...btn('transparent', 'var(--gj-green-ink)'), border: '1.5px solid var(--gj-green)', padding: '8px 11px' }}>
                    <Icon name="arrow-up" size={14} /> {busyId === s.id ? '…' : 'Collecter'}
                  </button>
                  <button type="button" onClick={() => { setEditSource(s); setModalOpen(true) }} aria-label={`Modifier ${s.nom}`} style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 9, border: '1.5px solid var(--gj-line)', background: 'transparent', color: 'var(--gj-grey)', cursor: 'pointer' }}>
                    <Icon name="settings" size={15} />
                  </button>
                  <button type="button" onClick={() => handleDelete(s)} aria-label={`Supprimer ${s.nom}`} style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 9, border: '1.5px solid var(--gj-red)', background: 'transparent', color: 'var(--gj-red-ink)', cursor: 'pointer' }}>
                    <Icon name="close" size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <SourceFormModal isOpen={modalOpen} onClose={() => { setModalOpen(false); router.refresh() }} source={editSource} types={types} />
      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
