'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { regionLabel } from '@/lib/regions'
import { CENTRE_SERVICES } from '@/lib/centre-services'
import type { Region, CentreService } from '@prisma/client'
import { creerCentre, modifierCentre } from './actions'

const REGIONS: Region[] = [
  'Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga',
  'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou',
] as Region[]

// Styles fidèles à la maquette (console admin, `.fmodal`) — tokens uniquement, thème-conscients.
const LABEL = 'block text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-color-text-muted mb-[7px]'
const FIELD =
  'w-full rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[10px] ' +
  'text-[13px] text-color-text-primary font-[inherit] outline-none transition-colors ' +
  'focus:border-[color:var(--gj-admin-gold)]'
const FROW = 'grid grid-cols-2 gap-[14px]'
const SEG_BTN = 'rounded-[9px] border px-2 py-[10px] text-[12.5px] font-bold transition-colors'
const SEG_OFF = 'border-[color:var(--gj-line-strong)] bg-transparent text-color-text-secondary hover:text-color-text-primary'
const SEG_ON = 'border-transparent bg-[var(--gj-admin-gold)] text-[color:var(--gj-admin-on-gold)]'

/** Valeurs initiales pour l'édition (sous-ensemble des champs Centre éditables). */
export interface CentreFormValues {
  id?: string
  nom?: string
  region?: string
  ville?: string | null
  adresse?: string
  latitude?: number
  longitude?: number
  telephone?: string
  email?: string | null
  responsable?: string
  services?: string[]
  estActif?: boolean
}

export interface CentreFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** Présent (avec id) = édition ; absent = création. */
  centre?: CentreFormValues
  /** Appelé après succès (création/édition) — la liste affiche un toast. */
  onSuccess?: (action: 'create' | 'update') => void
}

function Fld({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={LABEL}>{label}</label>
      {children}
    </div>
  )
}

export function CentreFormModal({ isOpen, onClose, centre, onSuccess }: CentreFormModalProps) {
  const editing = Boolean(centre?.id)
  const [nom, setNom] = useState(centre?.nom ?? '')
  const [region, setRegion] = useState<string>(centre?.region ?? 'Dakar')
  const [ville, setVille] = useState(centre?.ville ?? '')
  const [adresse, setAdresse] = useState(centre?.adresse ?? '')
  const [latitude, setLatitude] = useState(centre?.latitude != null ? String(centre.latitude) : '')
  const [longitude, setLongitude] = useState(centre?.longitude != null ? String(centre.longitude) : '')
  const [telephone, setTelephone] = useState(centre?.telephone ?? '')
  const [email, setEmail] = useState(centre?.email ?? '')
  const [responsable, setResponsable] = useState(centre?.responsable ?? '')
  const [services, setServices] = useState<string[]>(centre?.services ?? [])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggleService(value: string) {
    setServices((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input = {
      nom,
      region: region as Region,
      ville: ville.trim() || null,
      adresse,
      latitude: Number(latitude),
      longitude: Number(longitude),
      telephone,
      email: email.trim() || null,
      responsable,
      services: services as CentreService[],
      estActif: centre?.estActif ?? true,
    }
    startTransition(async () => {
      try {
        if (editing && centre?.id) {
          await modifierCentre(centre.id, input)
          onSuccess?.('update')
        } else {
          await creerCentre(input)
          onSuccess?.('create')
        }
        onClose()
      } catch {
        setError(
          'Échec — vérifie les champs : téléphone au format +221XXXXXXXXX, ' +
            'e-mail valide, latitude (-90 à 90) et longitude (-180 à 180) numériques.',
        )
      }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? `Éditer · ${centre?.nom ?? 'centre'}` : 'Nouveau centre'}
      maxWidth="max-w-[640px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}
            className="!bg-transparent !text-color-text-secondary border border-[color:var(--gj-line-strong)] hover:!text-color-text-primary">
            Annuler
          </Button>
          <Button type="submit" form="centre-form" variant="primary" disabled={pending}
            className="!bg-[var(--gj-admin-gold)] !text-[color:var(--gj-admin-on-gold)] hover:!opacity-90">
            {editing ? 'Enregistrer' : 'Créer le centre'}
          </Button>
        </>
      }
    >
      <form id="centre-form" onSubmit={handleSubmit} className="flex flex-col gap-[16px]">
        <Fld label="Nom" htmlFor="centre-nom">
          <input id="centre-nom" className={FIELD} required placeholder="CJS …" value={nom} onChange={(e) => setNom(e.target.value)} />
        </Fld>

        <div className={FROW}>
          <Fld label="Région" htmlFor="centre-region">
            <select id="centre-region" className={FIELD} value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{regionLabel(r) ?? r}</option>
              ))}
            </select>
          </Fld>
          <Fld label="Ville" htmlFor="centre-ville">
            <input id="centre-ville" className={FIELD} value={ville ?? ''} onChange={(e) => setVille(e.target.value)} />
          </Fld>
        </div>

        <Fld label="Adresse" htmlFor="centre-adresse">
          <input id="centre-adresse" className={FIELD} required value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </Fld>

        <div className={FROW}>
          <Fld label="Latitude" htmlFor="centre-latitude">
            <input id="centre-latitude" className={FIELD} type="number" step="any" min={-90} max={90} required value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </Fld>
          <Fld label="Longitude" htmlFor="centre-longitude">
            <input id="centre-longitude" className={FIELD} type="number" step="any" min={-180} max={180} required value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </Fld>
        </div>

        <div className={FROW}>
          <Fld label="Téléphone" htmlFor="centre-telephone">
            <input id="centre-telephone" className={FIELD} type="tel" inputMode="tel" pattern="\+221[0-9]{9}" placeholder="+221770000000" required value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          </Fld>
          <Fld label="E-mail" htmlFor="centre-email">
            <input id="centre-email" className={FIELD} type="email" placeholder="contact@cjs.sn" value={email ?? ''} onChange={(e) => setEmail(e.target.value)} />
          </Fld>
        </div>

        <Fld label="Responsable" htmlFor="centre-responsable">
          <input id="centre-responsable" className={FIELD} required value={responsable} onChange={(e) => setResponsable(e.target.value)} />
        </Fld>

        <Fld label="Services">
          <div className="flex flex-wrap gap-[6px]" role="group" aria-label="Services">
            {CENTRE_SERVICES.map((s) => {
              const on = services.includes(s.value)
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleService(s.value)}
                  className={`flex-1 min-w-[104px] ${SEG_BTN} ${on ? SEG_ON : SEG_OFF}`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </Fld>

        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
      </form>
    </Modal>
  )
}
