'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ajouterExemplaire, modifierExemplaire, retirerExemplaire } from '../../actions'
import type { ExemplaireDetail } from '@/lib/loaders/conseiller-bibliotheque'

const TONE: Record<ExemplaireDetail['statutTone'], [string, string]> = {
  green: ['var(--gj-green-soft)', 'var(--gj-green-ink)'],
  yellow: ['var(--gj-yellow-soft)', 'var(--gj-yellow-ink)'],
  blue: ['var(--gj-blue-soft)', 'var(--gj-blue-ink)'],
  grey: ['var(--gj-bg)', 'var(--gj-grey)'],
}

export function ExemplairesManager({ livreId, exemplaires }: { livreId: string; exemplaires: ExemplaireDetail[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [add, setAdd] = useState(false)
  const [edit, setEdit] = useState<ExemplaireDetail | null>(null)
  const [del, setDel] = useState<ExemplaireDetail | null>(null)
  // form
  const [f, setF] = useState({ codeBarre: '', rayon: '', etagere: '', position: '', statut: 'disponible' as 'disponible' | 'indisponible' })

  const openAdd = () => { setF({ codeBarre: '', rayon: '', etagere: '', position: '', statut: 'disponible' }); setError(null); setAdd(true) }
  const openEdit = (e: ExemplaireDetail) => { setF({ codeBarre: e.codeBarre, rayon: e.rayon, etagere: e.etagere, position: e.position, statut: e.statut === 'indisponible' ? 'indisponible' : 'disponible' }); setError(null); setEdit(e) }

  const run = (fn: () => Promise<{ error?: { message: string } }>, onOk: () => void) => {
    setError(null)
    start(async () => {
      const res = await fn()
      if (res.error) setError(res.error.message)
      else { onOk(); router.refresh() }
    })
  }

  return (
    <div className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
      <div className="flex items-center justify-between mb-space-3 gap-space-2 flex-wrap">
        <h2 className="font-black text-color-text-primary m-0" style={{ fontSize: 15 }}>Exemplaires ({exemplaires.length})</h2>
        <button type="button" onClick={openAdd} className="inline-flex items-center gap-space-2 font-extrabold" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '9px 14px', borderRadius: 9, fontSize: 12.5 }}>
          <Icon name="plus" size={14} /> Ajouter un exemplaire
        </button>
      </div>

      <div className="flex flex-col">
        {exemplaires.map((e) => (
          <div key={e.id} className="flex items-center gap-space-3 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
            <span className="inline-flex items-center justify-center shrink-0 rounded-gj-md" style={{ width: 38, height: 38, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}><Icon name="learning" size={18} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13 }}>{e.codeBarre}</div>
              <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5 }}>{e.emplacement}{e.emprunteur ? ` · ${e.emprunteur}` : ''}</div>
            </div>
            <span className="inline-flex font-extrabold shrink-0" style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 999, background: TONE[e.statutTone][0], color: TONE[e.statutTone][1] }}>{e.statutLabel}</span>
            {e.modifiable && (
              <div className="flex gap-space-1 shrink-0">
                <button type="button" onClick={() => openEdit(e)} aria-label="Modifier" className="inline-flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--gj-line)', background: '#fff', color: 'var(--gj-grey)' }}><Icon name="settings" size={14} /></button>
                <button type="button" onClick={() => { setError(null); setDel(e) }} aria-label="Retirer" className="inline-flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--gj-line)', background: '#fff', color: 'var(--gj-red)' }}><Icon name="close" size={14} /></button>
              </div>
            )}
          </div>
        ))}
        {exemplaires.length === 0 && <p className="text-color-text-secondary m-0" style={{ fontSize: 12.5 }}>Aucun exemplaire dans ce centre. Ajoutez-en un.</p>}
      </div>

      {/* Ajouter */}
      {add && (
        <Modal isOpen onClose={() => setAdd(false)} title="Ajouter un exemplaire">
          <div className="flex flex-col gap-space-3">
            <Input id="ex-cb" label="Code-barre" value={f.codeBarre} onChange={(ev) => setF({ ...f, codeBarre: ev.target.value })} />
            <div className="grid gap-space-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <Input id="ex-r" label="Rayon" value={f.rayon} onChange={(ev) => setF({ ...f, rayon: ev.target.value })} />
              <Input id="ex-e" label="Étagère" value={f.etagere} onChange={(ev) => setF({ ...f, etagere: ev.target.value })} />
              <Input id="ex-p" label="Position" value={f.position} onChange={(ev) => setF({ ...f, position: ev.target.value })} />
            </div>
            {error && <p className="text-fs-200 m-0" style={{ color: 'var(--gj-red)' }}>{error}</p>}
            <div className="flex justify-end gap-space-2">
              <button type="button" onClick={() => setAdd(false)} disabled={pending} className="font-extrabold" style={{ background: '#fff', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)', padding: '11px 18px', borderRadius: 9, fontSize: 13.5 }}>Annuler</button>
              <button type="button" disabled={pending} onClick={() => run(() => ajouterExemplaire(livreId, { codeBarre: f.codeBarre, rayon: f.rayon, etagere: f.etagere, position: f.position }), () => setAdd(false))} className="font-extrabold disabled:opacity-60" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '11px 22px', borderRadius: 9, fontSize: 13.5 }}>Ajouter</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Éditer */}
      {edit && (
        <Modal isOpen onClose={() => setEdit(null)} title="Modifier l'exemplaire">
          <div className="flex flex-col gap-space-3">
            <div className="grid gap-space-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <Input id="ed-r" label="Rayon" value={f.rayon} onChange={(ev) => setF({ ...f, rayon: ev.target.value })} />
              <Input id="ed-e" label="Étagère" value={f.etagere} onChange={(ev) => setF({ ...f, etagere: ev.target.value })} />
              <Input id="ed-p" label="Position" value={f.position} onChange={(ev) => setF({ ...f, position: ev.target.value })} />
            </div>
            <Select id="ed-s" label="Statut" value={f.statut} onChange={(ev) => setF({ ...f, statut: ev.target.value as 'disponible' | 'indisponible' })} options={[{ value: 'disponible', label: 'Disponible' }, { value: 'indisponible', label: 'Indisponible' }]} />
            {error && <p className="text-fs-200 m-0" style={{ color: 'var(--gj-red)' }}>{error}</p>}
            <div className="flex justify-end gap-space-2">
              <button type="button" onClick={() => setEdit(null)} disabled={pending} className="font-extrabold" style={{ background: '#fff', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)', padding: '11px 18px', borderRadius: 9, fontSize: 13.5 }}>Annuler</button>
              <button type="button" disabled={pending} onClick={() => run(() => modifierExemplaire(edit.id, livreId, { rayon: f.rayon, etagere: f.etagere, position: f.position, statut: f.statut }), () => setEdit(null))} className="font-extrabold disabled:opacity-60" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '11px 22px', borderRadius: 9, fontSize: 13.5 }}>Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Retirer */}
      {del && (
        <Modal isOpen onClose={() => setDel(null)} title="Retirer l'exemplaire">
          <div className="flex flex-col gap-space-4">
            <p className="text-fs-300 m-0">Retirer l&apos;exemplaire <strong>{del.codeBarre}</strong> du catalogue ? Cette action est définitive.</p>
            {error && <p className="text-fs-200 m-0" style={{ color: 'var(--gj-red)' }}>{error}</p>}
            <div className="flex justify-end gap-space-2">
              <button type="button" onClick={() => setDel(null)} disabled={pending} className="font-extrabold" style={{ background: '#fff', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)', padding: '11px 18px', borderRadius: 9, fontSize: 13.5 }}>Annuler</button>
              <button type="button" disabled={pending} onClick={() => run(() => retirerExemplaire(del.id, livreId), () => setDel(null))} className="font-extrabold disabled:opacity-60" style={{ background: 'var(--gj-red)', color: '#fff', border: 0, padding: '11px 22px', borderRadius: 9, fontSize: 13.5 }}>Retirer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
