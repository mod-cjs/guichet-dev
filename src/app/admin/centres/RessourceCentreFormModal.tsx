'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { creerRessourceCentre, modifierRessourceCentre } from './ressources-actions'

const TYPE_OPTIONS = [
  { value: 'Salle', label: 'Salle' },
  { value: 'Vehicule', label: 'Véhicule' },
  { value: 'Poste_info', label: 'Poste info' },
  { value: 'Equipement', label: 'Équipement' },
  { value: 'Atelier_recurrent', label: 'Atelier récurrent' },
]

const BOOL_OPTIONS = [
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' },
]

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
  const [capaciteUnit, setCapaciteUnit] = useState(ressource?.capaciteUnit ?? '')
  const [dureeMinCreneauMin, setDuree] = useState(ressource?.dureeMinCreneauMin != null ? String(ressource.dureeMinCreneauMin) : '60')
  const [requiresJustif, setRequiresJustif] = useState(ressource?.requiresJustif ?? false)
  const [estActive, setEstActive] = useState(ressource?.estActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      type,
      nom,
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      capacite: Number(capacite),
      capaciteUnit: capaciteUnit.trim() || null,
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
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Modifier la ressource' : 'Nouvelle ressource'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-3">
        <Select id="rc-type" label="Type" options={TYPE_OPTIONS} value={type} disabled={editing} onChange={(e) => setType(e.target.value)} />
        <Input id="rc-nom" label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
        <Textarea id="rc-desc" label="Description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
        <Input id="rc-image" label="Image (URL, optionnel)" type="url" value={imageUrl ?? ''} onChange={(e) => setImageUrl(e.target.value)} />
        <Input id="rc-capacite" label="Capacité" type="number" min={1} required value={capacite} onChange={(e) => setCapacite(e.target.value)} />
        <Input id="rc-unit" label="Unité de capacité (ex. personnes, postes)" value={capaciteUnit ?? ''} onChange={(e) => setCapaciteUnit(e.target.value)} />
        <Input id="rc-duree" label="Durée min. d’un créneau (minutes)" type="number" min={15} step={15} required value={dureeMinCreneauMin} onChange={(e) => setDuree(e.target.value)} />
        <Select id="rc-justif" label="Justificatif requis à la réservation ?" options={BOOL_OPTIONS} value={String(requiresJustif)} onChange={(e) => setRequiresJustif(e.target.value === 'true')} />
        <Select id="rc-active" label="Statut" options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} value={String(estActive)} onChange={(e) => setEstActive(e.target.value === 'true')} />
        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
        <div className="flex items-center justify-end gap-space-2 mt-space-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button type="submit" variant="primary" disabled={pending}>{editing ? 'Enregistrer' : 'Créer la ressource'}</Button>
        </div>
      </form>
    </Modal>
  )
}
