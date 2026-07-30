'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { regionLabel } from '@/lib/regions'
import { CENTRE_SERVICES } from '@/lib/centre-services'
import type { Region, Jour } from '@prisma/client'
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

const PRESET_VALUES = new Set(CENTRE_SERVICES.map((s) => s.value as string))
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

interface HoraireRow { jour: string; ouvert: boolean; ouvreA: string; fermeA: string }

/** Initialise les 7 jours : depuis l'existant (édition), sinon un gabarit Lun–Sam ouvert. */
function initHoraires(existing: CentreFormValues['horaires']): HoraireRow[] {
  const editing = existing !== undefined
  const map = new Map((existing ?? []).map((h) => [h.jour, h]))
  return JOURS.map((j) => {
    const e = map.get(j)
    if (e) return { jour: j, ouvert: e.ouvert, ouvreA: e.ouvreA ?? '08:00', fermeA: e.fermeA ?? '18:00' }
    if (editing) return { jour: j, ouvert: false, ouvreA: '08:00', fermeA: '18:00' }
    const dimanche = j === 'Dimanche'
    return { jour: j, ouvert: !dimanche, ouvreA: j === 'Samedi' ? '09:00' : '08:00', fermeA: j === 'Samedi' ? '13:00' : '18:00' }
  })
}

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
  horaires?: { jour: string; ouvert: boolean; ouvreA: string | null; fermeA: string | null }[]
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
  const [customSvc, setCustomSvc] = useState('')
  const [horaires, setHoraires] = useState<HoraireRow[]>(() => initHoraires(centre?.horaires))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggleService(value: string) {
    setServices((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]))
  }
  function addCustomService() {
    const v = customSvc.trim()
    if (!v) return
    setServices((prev) => (prev.includes(v) ? prev : [...prev, v]))
    setCustomSvc('')
  }
  function setHoraire(jour: string, patch: Partial<HoraireRow>) {
    setHoraires((prev) => prev.map((h) => (h.jour === jour ? { ...h, ...patch } : h)))
  }
  const customServices = services.filter((s) => !PRESET_VALUES.has(s))

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
      services,
      horaires: horaires.map((h) => ({
        jour: h.jour as Jour,
        ouvert: h.ouvert,
        ouvreA: h.ouvert ? h.ouvreA : null,
        fermeA: h.ouvert ? h.fermeA : null,
      })),
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
            {customServices.map((cs) => (
              <span
                key={cs}
                className={`inline-flex items-center gap-[6px] ${SEG_BTN} ${SEG_ON}`}
              >
                {cs}
                <button type="button" aria-label={`Retirer ${cs}`} onClick={() => toggleService(cs)} className="leading-none text-[15px]">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-[8px] mt-[8px]">
            <input
              aria-label="Autre service"
              className={FIELD}
              placeholder="Autre service…"
              value={customSvc}
              onChange={(e) => setCustomSvc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomService() } }}
            />
            <Button type="button" variant="secondary" onClick={addCustomService}
              className="shrink-0 !bg-transparent !text-color-text-secondary border border-[color:var(--gj-line-strong)] hover:!text-color-text-primary">
              Ajouter
            </Button>
          </div>
        </Fld>

        <Fld label="Horaires d'ouverture">
          <div className="flex flex-col gap-[6px]" role="group" aria-label="Horaires d'ouverture">
            {horaires.map((h) => (
              <div key={h.jour} className="grid grid-cols-[92px_84px_1fr] items-center gap-[10px]">
                <span className="text-[12.5px] font-bold text-color-text-primary">{h.jour}</span>
                <button
                  type="button"
                  aria-pressed={h.ouvert}
                  aria-label={`${h.jour} : ${h.ouvert ? 'ouvert' : 'fermé'}`}
                  onClick={() => setHoraire(h.jour, { ouvert: !h.ouvert })}
                  className={`${SEG_BTN} ${h.ouvert ? SEG_ON : SEG_OFF}`}
                >
                  {h.ouvert ? 'Ouvert' : 'Fermé'}
                </button>
                {h.ouvert ? (
                  <div className="flex items-center gap-[8px]">
                    <input type="time" aria-label={`${h.jour} ouverture`} className={`${FIELD} !w-[116px]`} value={h.ouvreA} onChange={(e) => setHoraire(h.jour, { ouvreA: e.target.value })} />
                    <span className="text-color-text-muted">–</span>
                    <input type="time" aria-label={`${h.jour} fermeture`} className={`${FIELD} !w-[116px]`} value={h.fermeA} onChange={(e) => setHoraire(h.jour, { fermeA: e.target.value })} />
                  </div>
                ) : (
                  <span className="text-[12px] text-color-text-muted">Fermé toute la journée</span>
                )}
              </div>
            ))}
          </div>
        </Fld>

        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
      </form>
    </Modal>
  )
}
