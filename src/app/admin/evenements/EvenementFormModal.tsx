'use client'

import { useState, useTransition } from 'react'
import { TypeEvenement, StatutEvenement } from '@prisma/client'
import { Modal } from '@/components/ui/Modal'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { ImageUploadField } from '@/components/admin/ImageUploadField'
import { creerEvenement, modifierEvenement } from './actions'

const TYPE_OPTIONS = (['Formation', 'Atelier', 'Forum', 'Webinar', 'Conference', 'Cours'] as const).map((v) => ({ value: v as string, label: v }))
const STATUT_OPTIONS = [
  { value: 'a_venir', label: 'À venir' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'annule', label: 'Annulé' },
]

// Styles fmodal (identiques aux modals Centre/Ressource — labels MAJ, champs sombres, seg dorés).
const LABEL = 'block text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-color-text-muted mb-[7px]'
const FIELD =
  'w-full rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[10px] ' +
  'text-[13px] text-color-text-primary font-[inherit] outline-none transition-colors ' +
  'focus:border-[color:var(--gj-admin-gold)]'
const FROW = 'grid grid-cols-2 gap-[14px]'
const SEG_BTN = 'rounded-[9px] border px-2 py-[10px] text-[12.5px] font-bold transition-colors'
const SEG_OFF = 'border-[color:var(--gj-line-strong)] bg-transparent text-color-text-secondary hover:text-color-text-primary'
const SEG_ON = 'border-transparent bg-[var(--gj-admin-gold)] text-[color:var(--gj-admin-on-gold)]'

function Fld({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className={LABEL}>{label}</label>{children}</div>
}
function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Fld label={label}>
      <div className="flex flex-wrap gap-[6px]" role="group" aria-label={label}>
        {options.map((o) => {
          const on = value === o.value
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)} className={`flex-1 min-w-[92px] ${SEG_BTN} ${on ? SEG_ON : SEG_OFF}`}>{o.label}</button>
          )
        })}
      </div>
    </Fld>
  )
}

/** Valeurs initiales pour l'édition. */
export interface EvenementFormValues {
  id?: string
  titre?: string
  description?: string
  type?: string
  statut?: string
  /** dateDebut au format ISO (sera converti en datetime-local). */
  dateDebut?: string
  /** dateFin au format ISO (optionnelle). */
  dateFin?: string | null
  lieu?: string
  /** Centre de rattachement (GUIC-474 — cours/sessions au centre). */
  centreId?: string | null
  capaciteMax?: number | null
  estGratuit?: boolean
  /** Photo / visuel de l'événement (URL bucket). */
  imageUrl?: string | null
}

export interface EvenementFormModalProps {
  isOpen: boolean
  onClose: () => void
  evenement?: EvenementFormValues
  /** Centres proposables pour le rattachement (GUIC-474). */
  centres?: { id: string; nom: string }[]
  /** Appelé après succès (création/édition) — la liste affiche un toast. */
  onSuccess?: (action: 'create' | 'update') => void
}

/** ISO → valeur d'un input datetime-local ("YYYY-MM-DDTHH:mm"). */
function toLocalInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EvenementFormModal({ isOpen, onClose, evenement, centres = [], onSuccess }: EvenementFormModalProps) {
  const editing = Boolean(evenement?.id)
  const [titre, setTitre] = useState(evenement?.titre ?? '')
  const [description, setDescription] = useState(evenement?.description ?? '')
  const [type, setType] = useState<string>(evenement?.type ?? TypeEvenement.Atelier)
  const [statut, setStatut] = useState<string>(evenement?.statut ?? StatutEvenement.a_venir)
  const [dateDebut, setDateDebut] = useState(toLocalInput(evenement?.dateDebut))
  const [dateFin, setDateFin] = useState(toLocalInput(evenement?.dateFin ?? undefined))
  const [lieu, setLieu] = useState(evenement?.lieu ?? '')
  const [centreId, setCentreId] = useState(evenement?.centreId ?? '')
  const [capaciteMax, setCapaciteMax] = useState(evenement?.capaciteMax != null ? String(evenement.capaciteMax) : '')
  const [estGratuit, setEstGratuit] = useState(evenement?.estGratuit ?? true)
  const [imageUrl, setImageUrl] = useState(evenement?.imageUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const centreOptions = [{ value: '', label: '— Aucun (hors centre)' }, ...centres.map((c) => ({ value: c.id, label: c.nom }))]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input = {
      titre,
      description,
      type: type as TypeEvenement,
      statut: statut as StatutEvenement,
      dateDebut: new Date(dateDebut),
      dateFin: dateFin.trim() ? new Date(dateFin) : null,
      lieu,
      imageUrl: imageUrl.trim() || null,
      centreId: centreId || null,
      capaciteMax: capaciteMax.trim() ? Number(capaciteMax) : null,
      estGratuit,
    }
    startTransition(async () => {
      try {
        if (editing && evenement?.id) {
          await modifierEvenement(evenement.id, input)
          onSuccess?.('update')
        } else {
          await creerEvenement(input)
          onSuccess?.('create')
        }
        onClose()
      } catch {
        setError('Échec — vérifie les champs requis (date valide, titre, lieu).')
      }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Modifier l'événement" : 'Ajouter un événement'}
      maxWidth="max-w-[640px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}
            className="!bg-transparent !text-color-text-secondary border border-[color:var(--gj-line-strong)] hover:!text-color-text-primary">
            Annuler
          </Button>
          <Button type="submit" form="ev-form" variant="primary" disabled={pending}
            className="!bg-[var(--gj-admin-gold)] !text-[color:var(--gj-admin-on-gold)] hover:!opacity-90">
            {editing ? 'Enregistrer' : "Créer l'événement"}
          </Button>
        </>
      }
    >
      <form id="ev-form" onSubmit={handleSubmit} className="flex flex-col gap-[16px]">
        <Fld label="Titre" htmlFor="ev-titre">
          <input id="ev-titre" className={FIELD} required placeholder="Forum de l'emploi…" value={titre} onChange={(e) => setTitre(e.target.value)} />
        </Fld>

        <Fld label="Description" htmlFor="ev-description">
          <RichTextEditor id="ev-description" value={description} onChange={setDescription} />
        </Fld>

        <Seg label="Type" value={type} options={TYPE_OPTIONS} onChange={setType} />

        <div className={FROW}>
          <Fld label="Date de début" htmlFor="ev-date">
            <input id="ev-date" className={FIELD} type="datetime-local" required value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </Fld>
          <Fld label="Date de fin (optionnel)" htmlFor="ev-datefin">
            <input id="ev-datefin" className={FIELD} type="datetime-local" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </Fld>
        </div>

        <Fld label="Lieu" htmlFor="ev-lieu">
          <input id="ev-lieu" className={FIELD} required placeholder="Salle polyvalente, adresse…" value={lieu} onChange={(e) => setLieu(e.target.value)} />
        </Fld>

        <Fld label="Photo (optionnel)">
          <ImageUploadField value={imageUrl ?? ''} onChange={setImageUrl} disabled={pending} />
        </Fld>

        <div className={FROW}>
          <Fld label="Centre (cours/session)" htmlFor="ev-centre">
            <select id="ev-centre" className={FIELD} value={centreId} onChange={(e) => setCentreId(e.target.value)}>
              {centreOptions.map((o) => <option key={o.value || 'none'} value={o.value}>{o.label}</option>)}
            </select>
          </Fld>
          <Fld label="Capacité max" htmlFor="ev-capacite">
            <input id="ev-capacite" className={FIELD} type="number" min={1} placeholder="Illimitée si vide" value={capaciteMax} onChange={(e) => setCapaciteMax(e.target.value)} />
          </Fld>
        </div>

        <div className={FROW}>
          <Seg label="Tarif" value={estGratuit ? 'true' : 'false'} options={[{ value: 'true', label: 'Gratuit' }, { value: 'false', label: 'Payant' }]} onChange={(v) => setEstGratuit(v === 'true')} />
          <Seg label="Statut" value={statut} options={STATUT_OPTIONS} onChange={setStatut} />
        </div>

        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
      </form>
    </Modal>
  )
}
