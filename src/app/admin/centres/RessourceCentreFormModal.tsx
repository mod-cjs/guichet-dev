'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { htmlToPlainText } from '@/lib/rich-html'
import { ImageUploadField } from './ImageUploadField'
import { creerRessourceCentre, modifierRessourceCentre } from './ressources-actions'

/**
 * Type de ressource + configuration ADAPTATIVE du formulaire (GUIC-687) :
 * chaque type porte son unité de capacité par défaut, ses libellés et un choix
 * « justificatif requis » pertinent. Ajouter un type = une entrée ici.
 */
const TYPES: Record<string, { label: string; unit: string; capLabel: string; justifDefault: boolean; hint: string }> = {
  Salle: { label: 'Salle', unit: 'personnes', capLabel: 'Capacité (personnes)', justifDefault: false, hint: 'Salle de réunion, de formation, polyvalente…' },
  Vehicule: { label: 'Véhicule', unit: 'places', capLabel: 'Places assises', justifDefault: true, hint: 'Un justificatif est généralement requis pour un véhicule.' },
  Poste_info: { label: 'Poste info', unit: 'postes', capLabel: 'Nombre de postes', justifDefault: false, hint: 'Postes informatiques en libre accès.' },
  Equipement: { label: 'Équipement', unit: 'unités', capLabel: 'Quantité', justifDefault: false, hint: 'Matériel prêté : kit vidéo, sono, vidéoprojecteur…' },
  Atelier_recurrent: { label: 'Atelier récurrent', unit: 'participants', capLabel: 'Participants max', justifDefault: false, hint: 'Atelier à créneaux réguliers (inscription).' },
}
const TYPE_ORDER = ['Salle', 'Vehicule', 'Poste_info', 'Equipement', 'Atelier_recurrent']

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
  return (
    <div>
      <label htmlFor={htmlFor} className={LABEL}>{label}</label>
      {children}
    </div>
  )
}

export interface RessourceCentreValues {
  id?: string
  type?: string
  nom?: string
  description?: string | null
  imageUrl?: string | null
  capacite?: number
  capaciteUnit?: string | null
  dureeMinCreneauMin?: number
  requiresJustif?: boolean
  estActive?: boolean
}

export interface RessourceCentreFormModalProps {
  isOpen: boolean
  onClose: () => void
  centreId: string
  /** Présent (avec id) = édition ; absent = création. */
  ressource?: RessourceCentreValues
}

export function RessourceCentreFormModal({ isOpen, onClose, centreId, ressource }: RessourceCentreFormModalProps) {
  const editing = Boolean(ressource?.id)
  const [type, setType] = useState(ressource?.type ?? 'Salle')
  const [nom, setNom] = useState(ressource?.nom ?? '')
  const [description, setDescription] = useState(ressource?.description ?? '')
  const [imageUrl, setImageUrl] = useState(ressource?.imageUrl ?? '')
  const [capacite, setCapacite] = useState(ressource?.capacite != null ? String(ressource.capacite) : '1')
  // Unité : suit le type tant que l'utilisateur ne l'a pas personnalisée.
  const [capaciteUnit, setCapaciteUnit] = useState(ressource?.capaciteUnit ?? '')
  const [unitTouched, setUnitTouched] = useState(Boolean(ressource?.capaciteUnit))
  const [dureeMinCreneauMin, setDuree] = useState(ressource?.dureeMinCreneauMin != null ? String(ressource.dureeMinCreneauMin) : '60')
  const [requiresJustif, setRequiresJustif] = useState(ressource?.requiresJustif ?? false)
  const [estActive, setEstActive] = useState(ressource?.estActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const cfg = TYPES[type] ?? TYPES.Salle
  const effectiveUnit = unitTouched ? capaciteUnit : cfg.unit

  function pickType(next: string) {
    setType(next)
    const c = TYPES[next]
    if (c && !editing) setRequiresJustif(c.justifDefault)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      type,
      nom,
      description: htmlToPlainText(description).trim() ? description : null,
      imageUrl: imageUrl.trim() || null,
      capacite: Number(capacite),
      capaciteUnit: (effectiveUnit || '').trim() || null,
      dureeMinCreneauMin: Number(dureeMinCreneauMin),
      requiresJustif,
      estActive,
    }
    startTransition(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (editing && ressource?.id) await modifierRessourceCentre(ressource.id, payload as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else await creerRessourceCentre(centreId, payload as any)
        onClose()
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'CENTRE_INTROUVABLE') setError('Centre introuvable.')
        else if (msg === 'FORBIDDEN') setError('Action réservée aux administrateurs.')
        else setError('Échec — vérifie le nom, le type et la capacité (≥ 1).')
      }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Modifier la ressource' : 'Nouvelle ressource'}
      maxWidth="max-w-[560px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}
            className="!bg-transparent !text-color-text-secondary border border-[color:var(--gj-line-strong)] hover:!text-color-text-primary">
            Annuler
          </Button>
          <Button type="submit" form="rc-form" variant="primary" disabled={pending}
            className="!bg-[var(--gj-admin-gold)] !text-[color:var(--gj-admin-on-gold)] hover:!opacity-90">
            {editing ? 'Enregistrer' : 'Créer la ressource'}
          </Button>
        </>
      }
    >
      <form id="rc-form" onSubmit={handleSubmit} className="flex flex-col gap-[16px]">
        <Fld label="Type de ressource">
          <div className="flex flex-wrap gap-[6px]" role="group" aria-label="Type de ressource">
            {TYPE_ORDER.map((v) => {
              const on = type === v
              return (
                <button key={v} type="button" aria-pressed={on} disabled={editing} onClick={() => pickType(v)}
                  className={`flex-1 min-w-[104px] ${SEG_BTN} ${on ? SEG_ON : SEG_OFF} ${editing ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {TYPES[v].label}
                </button>
              )
            })}
          </div>
          <p className="text-[11.5px] text-color-text-muted mt-[7px]">{cfg.hint}</p>
        </Fld>

        <Fld label="Nom" htmlFor="rc-nom">
          <input id="rc-nom" className={FIELD} required placeholder="Salle de réunion A…" value={nom} onChange={(e) => setNom(e.target.value)} />
        </Fld>

        <Fld label="Description" htmlFor="rc-desc">
          <RichTextEditor id="rc-desc" value={description ?? ''} onChange={setDescription} />
        </Fld>

        <div className={FROW}>
          <Fld label={cfg.capLabel} htmlFor="rc-capacite">
            <input id="rc-capacite" className={FIELD} type="number" min={1} required value={capacite} onChange={(e) => setCapacite(e.target.value)} />
          </Fld>
          <Fld label="Unité" htmlFor="rc-unit">
            <input id="rc-unit" className={FIELD} value={effectiveUnit} placeholder={cfg.unit} onChange={(e) => { setUnitTouched(true); setCapaciteUnit(e.target.value) }} />
          </Fld>
        </div>

        <Fld label="Durée min. d’un créneau (min)" htmlFor="rc-duree">
          <input id="rc-duree" className={`${FIELD} max-w-[200px]`} type="number" min={15} step={15} required value={dureeMinCreneauMin} onChange={(e) => setDuree(e.target.value)} />
        </Fld>

        <Fld label="Image (optionnel)">
          <ImageUploadField value={imageUrl ?? ''} onChange={setImageUrl} disabled={pending} />
        </Fld>

        <div className={FROW}>
          <Fld label="Justificatif requis ?">
            <div className="flex gap-[6px]" role="group" aria-label="Justificatif requis">
              {[{ v: true, l: 'Oui' }, { v: false, l: 'Non' }].map((o) => {
                const on = requiresJustif === o.v
                return (
                  <button key={o.l} type="button" aria-pressed={on} onClick={() => setRequiresJustif(o.v)} className={`flex-1 ${SEG_BTN} ${on ? SEG_ON : SEG_OFF}`}>{o.l}</button>
                )
              })}
            </div>
          </Fld>
          <Fld label="Statut">
            <div className="flex gap-[6px]" role="group" aria-label="Statut">
              {[{ v: true, l: 'Active' }, { v: false, l: 'Inactive' }].map((o) => {
                const on = estActive === o.v
                return (
                  <button key={o.l} type="button" aria-pressed={on} onClick={() => setEstActive(o.v)} className={`flex-1 ${SEG_BTN} ${on ? SEG_ON : SEG_OFF}`}>{o.l}</button>
                )
              })}
            </div>
          </Fld>
        </div>

        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
      </form>
    </Modal>
  )
}
