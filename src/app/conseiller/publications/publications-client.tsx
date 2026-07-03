'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { Icon } from '@/components/ui/Icon'
import { creerPublication } from './actions'

const TYPES = ['Atelier', 'Formation', 'Forum', 'Conference', 'Webinar', 'Cours'] as const

/** GUIC-477 — Bouton + modale de création d'une publication (événement) du centre. */
export function NouvellePublication() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [titre, setTitre] = useState('')
  const [type, setType] = useState<(typeof TYPES)[number]>('Atelier')
  const [date, setDate] = useState('')
  const [lieu, setLieu] = useState('')
  const [capacite, setCapacite] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const field: React.CSSProperties = { border: '1.5px solid var(--gj-line)', borderRadius: 9, padding: '10px 12px', fontSize: 13.5, color: 'var(--gj-ink)', background: 'var(--gj-bg)', outline: 'none', width: '100%', fontFamily: 'inherit' }
  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--gj-ink)', textTransform: 'uppercase', letterSpacing: '.4px' }

  const close = () => { setOpen(false); setError(null) }
  const reset = () => { setTitre(''); setType('Atelier'); setDate(''); setLieu(''); setCapacite(''); setDescription('') }

  const submit = () => {
    setError(null)
    start(async () => {
      const res = await creerPublication({
        titre,
        type,
        dateDebut: date,
        lieu,
        description,
        capaciteMax: capacite.trim() ? Number(capacite) : null,
      })
      if (res.error) setError(res.error.message)
      else { reset(); setOpen(false); router.refresh() }
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-space-2 no-underline font-extrabold" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
        <Icon name="plus" size={15} /> Nouvelle publication
      </button>

      {open && (
        <Modal isOpen onClose={close} title="Nouvelle publication">
          <div className="flex flex-col gap-space-3">
            <label className="flex flex-col gap-space-1">
              <span className="font-extrabold" style={labelStyle}>Titre</span>
              <input value={titre} onChange={(e) => setTitre(e.target.value)} style={field} placeholder="Ex. Atelier CV & lettre de motivation" />
            </label>
            <div className="flex gap-space-3 flex-wrap">
              <label className="flex flex-col gap-space-1 flex-1" style={{ minWidth: 140 }}>
                <span className="font-extrabold" style={labelStyle}>Type</span>
                <select value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number])} style={field}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-space-1 flex-1" style={{ minWidth: 140 }}>
                <span className="font-extrabold" style={labelStyle}>Date</span>
                <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} style={field} />
              </label>
            </div>
            <div className="flex gap-space-3 flex-wrap">
              <label className="flex flex-col gap-space-1 flex-1" style={{ minWidth: 140 }}>
                <span className="font-extrabold" style={labelStyle}>Lieu</span>
                <input value={lieu} onChange={(e) => setLieu(e.target.value)} style={field} placeholder="Ex. Salle A" />
              </label>
              <label className="flex flex-col gap-space-1 flex-1" style={{ minWidth: 140 }}>
                <span className="font-extrabold" style={labelStyle}>Capacité (facultatif)</span>
                <input type="number" min={1} value={capacite} onChange={(e) => setCapacite(e.target.value)} style={field} placeholder="Ex. 20" />
              </label>
            </div>
            <Textarea label="Description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez la publication…" />

            <div className="flex items-center gap-space-2" style={{ background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', borderRadius: 9, padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>
              <Icon name="info" size={14} /> La publication sera rattachée à votre centre.
            </div>
            {error && <p className="text-fs-200 m-0" style={{ color: 'var(--gj-red)' }}>{error}</p>}

            <div className="flex justify-end gap-space-2">
              <button type="button" onClick={close} disabled={pending} className="font-extrabold" style={{ background: '#fff', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)', padding: '11px 18px', borderRadius: 9, fontSize: 13.5 }}>Annuler</button>
              <button type="button" onClick={submit} disabled={pending} className="inline-flex items-center gap-space-2 font-extrabold disabled:opacity-60" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '11px 22px', borderRadius: 9, fontSize: 13.5 }}>
                <Icon name="check" size={16} /> Publier
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
