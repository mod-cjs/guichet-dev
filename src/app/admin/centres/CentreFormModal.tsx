'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { regionLabel } from '@/lib/regions'
import { creerCentre, modifierCentre, type CentreInput } from './actions'

const REGIONS = [
  'Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga',
  'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou',
]
const REGION_OPTIONS = REGIONS.map((r) => ({ value: r, label: regionLabel(r) ?? r }))
const STATUT_OPTIONS = [
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

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
}

export interface CentreFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** Présent (avec id) = édition ; absent = création. */
  centre?: CentreFormValues
}

export function CentreFormModal({ isOpen, onClose, centre }: CentreFormModalProps) {
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
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input: CentreInput = {
      nom,
      region: region as CentreInput['region'],
      adresse,
      latitude: Number(latitude),
      longitude: Number(longitude),
      telephone,
      responsable,
      ville: ville.trim() || null,
      estActif,
    }
    startTransition(async () => {
      try {
        if (editing && centre?.id) await modifierCentre(centre.id, input)
        else await creerCentre(input)
        onClose()
      } catch {
        setError('Échec — vérifie les champs requis (latitude/longitude numériques, région valide).')
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Modifier le centre' : 'Ajouter un centre'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-3">
        <Input id="centre-nom" label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
        <Select id="centre-region" label="Région" options={REGION_OPTIONS} value={region} onChange={(e) => setRegion(e.target.value)} />
        <Input id="centre-adresse" label="Adresse" required value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        <Input id="centre-latitude" label="Latitude" type="number" step="any" required value={latitude} onChange={(e) => setLatitude(e.target.value)} />
        <Input id="centre-longitude" label="Longitude" type="number" step="any" required value={longitude} onChange={(e) => setLongitude(e.target.value)} />
        <Input id="centre-telephone" label="Téléphone" required value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        <Input id="centre-responsable" label="Responsable" required value={responsable} onChange={(e) => setResponsable(e.target.value)} />
        <Input id="centre-ville" label="Ville" value={ville ?? ''} onChange={(e) => setVille(e.target.value)} />
        <Select id="centre-statut" label="Statut" options={STATUT_OPTIONS} value={String(estActif)} onChange={(e) => setEstActif(e.target.value === 'true')} />
        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
        <div className="flex items-center justify-end gap-space-2 mt-space-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button type="submit" variant="primary" disabled={pending}>{editing ? 'Enregistrer' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  )
}
