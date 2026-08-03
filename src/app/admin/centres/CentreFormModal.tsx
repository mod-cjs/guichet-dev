'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { regionLabel } from '@/lib/regions'
import { Region } from '@prisma/client'
import { creerCentre, modifierCentre } from './actions'
import { ProgrammesField, type ProgrammeOption } from '@/components/admin/ProgrammesField'

const REGIONS = [
  'Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga',
  'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou',
]
const REGION_OPTIONS = REGIONS.map((r) => ({ value: r, label: regionLabel(r) ?? r }))
const STATUT_OPTIONS = [
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

// B1 — messages de validation natifs en FRANÇAIS (au lieu des tooltips browser EN).
function setFrValidity(el: HTMLInputElement) {
  const v = el.validity
  if (v.valueMissing) el.setCustomValidity('Ce champ est requis.')
  else if (v.patternMismatch) el.setCustomValidity('Format attendu : +221 suivi de 9 chiffres.')
  else if (v.rangeOverflow || v.rangeUnderflow) el.setCustomValidity('Valeur hors des limites autorisées.')
  else if (v.badInput) el.setCustomValidity('Valeur numérique attendue.')
  else el.setCustomValidity('')
}
const frInval = {
  onInvalid: (e: React.FormEvent<HTMLInputElement>) => setFrValidity(e.currentTarget),
  onInput: (e: React.FormEvent<HTMLInputElement>) => e.currentTarget.setCustomValidity(''),
}

/** Valeurs initiales pour l'édition (sous-ensemble des champs Centre éditables). */
export interface CentreFormValues {
  id?: string
  nom?: string
  region?: string
  adresse?: string
  latitude?: number
  longitude?: number
  telephone?: string
  responsable?: string
  ville?: string | null
  estActif?: boolean
  /** GUIC-684 — programmes déployés dans ce centre (facultatif). */
  programmeSlugs?: string[]
  programmePrincipalSlug?: string | null
}

export interface CentreFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** Présent (avec id) = édition ; absent = création. */
  centre?: CentreFormValues
  /** Appelé après succès (création/édition) — la liste affiche un toast. */
  onSuccess?: (action: 'create' | 'update') => void
  /** GUIC-684 — programmes proposés au rattachement. */
  programmes?: ProgrammeOption[]
}

export function CentreFormModal({
  isOpen,
  onClose,
  centre,
  onSuccess,
  programmes = [],
}: CentreFormModalProps) {
  const editing = Boolean(centre?.id)
  const [nom, setNom] = useState(centre?.nom ?? '')
  const [region, setRegion] = useState<string>(centre?.region ?? 'Dakar')
  const [adresse, setAdresse] = useState(centre?.adresse ?? '')
  const [latitude, setLatitude] = useState(centre?.latitude != null ? String(centre.latitude) : '')
  const [longitude, setLongitude] = useState(centre?.longitude != null ? String(centre.longitude) : '')
  const [telephone, setTelephone] = useState(centre?.telephone ?? '')
  const [responsable, setResponsable] = useState(centre?.responsable ?? '')
  const [ville, setVille] = useState(centre?.ville ?? '')
  const [estActif, setEstActif] = useState(centre?.estActif ?? true)
  // GUIC-684 — facultatif ici : un centre existe sans programme.
  const [programmeSlugs, setProgrammeSlugs] = useState<string[]>(centre?.programmeSlugs ?? [])
  const [programmePrincipal, setProgrammePrincipal] = useState<string | null>(
    centre?.programmePrincipalSlug ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input = {
      nom,
      region: region as Region,
      adresse,
      latitude: Number(latitude),
      longitude: Number(longitude),
      telephone,
      responsable,
      ville: ville.trim() || null,
      estActif,
      programmeSlugs,
      programmePrincipalSlug: programmePrincipal,
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
            'latitude (-90 à 90) et longitude (-180 à 180) numériques, région valide.',
        )
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Modifier le centre' : 'Ajouter un centre'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-3">
        <Input id="centre-nom" label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} {...frInval} />
        <Select id="centre-region" label="Région" options={REGION_OPTIONS} value={region} onChange={(e) => setRegion(e.target.value)} />
        <Input id="centre-adresse" label="Adresse" required value={adresse} onChange={(e) => setAdresse(e.target.value)} {...frInval} />
        <Input id="centre-latitude" label="Latitude" type="number" step="any" min={-90} max={90} required value={latitude} onChange={(e) => setLatitude(e.target.value)} {...frInval} />
        <Input id="centre-longitude" label="Longitude" type="number" step="any" min={-180} max={180} required value={longitude} onChange={(e) => setLongitude(e.target.value)} {...frInval} />
        <Input id="centre-telephone" label="Téléphone (format +221XXXXXXXXX)" type="tel" inputMode="tel" pattern="\+221[0-9]{9}" placeholder="+221770000000" required value={telephone} onChange={(e) => setTelephone(e.target.value)} {...frInval} />
        <Input id="centre-responsable" label="Responsable" required value={responsable} onChange={(e) => setResponsable(e.target.value)} {...frInval} />
        <Input id="centre-ville" label="Ville" value={ville ?? ''} onChange={(e) => setVille(e.target.value)} />
        <Select id="centre-statut" label="Statut" options={STATUT_OPTIONS} value={String(estActif)} onChange={(e) => setEstActif(e.target.value === 'true')} />
        {programmes.length > 0 && (
          <ProgrammesField
            options={programmes}
            value={programmeSlugs}
            onChange={setProgrammeSlugs}
            principal={programmePrincipal}
            onPrincipalChange={setProgrammePrincipal}
          />
        )}
        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
        <div className="flex items-center justify-end gap-space-2 mt-space-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button type="submit" variant="primary" disabled={pending}>{editing ? 'Enregistrer' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  )
}
