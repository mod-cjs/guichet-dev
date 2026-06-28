'use client'

import { useState, useTransition } from 'react'
import { TypeEvenement, StatutEvenement } from '@prisma/client'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { creerEvenement, modifierEvenement } from './actions'

const TYPE_OPTIONS = (['Formation', 'Atelier', 'Forum', 'Webinar', 'Conference'] as const).map((v) => ({ value: v, label: v }))
const STATUT_OPTIONS = [
  { value: 'a_venir', label: 'À venir' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'annule', label: 'Annulé' },
]
const GRATUIT_OPTIONS = [
  { value: 'true', label: 'Gratuit' },
  { value: 'false', label: 'Payant' },
]

/** Valeurs initiales pour l'édition. */
export interface EvenementFormValues {
  id?: string
  titre?: string
  description?: string
  type?: string
  statut?: string
  /** dateDebut au format ISO (sera converti en datetime-local). */
  dateDebut?: string
  lieu?: string
  capaciteMax?: number | null
  estGratuit?: boolean
}

export interface EvenementFormModalProps {
  isOpen: boolean
  onClose: () => void
  evenement?: EvenementFormValues
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

export function EvenementFormModal({ isOpen, onClose, evenement, onSuccess }: EvenementFormModalProps) {
  const editing = Boolean(evenement?.id)
  const [titre, setTitre] = useState(evenement?.titre ?? '')
  const [description, setDescription] = useState(evenement?.description ?? '')
  const [type, setType] = useState<string>(evenement?.type ?? TypeEvenement.Atelier)
  const [statut, setStatut] = useState<string>(evenement?.statut ?? StatutEvenement.a_venir)
  const [dateDebut, setDateDebut] = useState(toLocalInput(evenement?.dateDebut))
  const [lieu, setLieu] = useState(evenement?.lieu ?? '')
  const [capaciteMax, setCapaciteMax] = useState(evenement?.capaciteMax != null ? String(evenement.capaciteMax) : '')
  const [estGratuit, setEstGratuit] = useState(evenement?.estGratuit ?? true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input = {
      titre,
      description,
      type: type as TypeEvenement,
      statut: statut as StatutEvenement,
      dateDebut: new Date(dateDebut),
      lieu,
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
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Modifier l\'événement' : 'Ajouter un événement'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-3">
        <Input id="ev-titre" label="Titre" required value={titre} onChange={(e) => setTitre(e.target.value)} />
        <Input id="ev-description" label="Description" required value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select id="ev-type" label="Type" options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value)} />
        <Input id="ev-date" label="Date de début" type="datetime-local" required value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
        <Input id="ev-lieu" label="Lieu" required value={lieu} onChange={(e) => setLieu(e.target.value)} />
        <Input id="ev-capacite" label="Capacité max" type="number" value={capaciteMax} onChange={(e) => setCapaciteMax(e.target.value)} />
        <Select id="ev-gratuit" label="Tarif" options={GRATUIT_OPTIONS} value={String(estGratuit)} onChange={(e) => setEstGratuit(e.target.value === 'true')} />
        <Select id="ev-statut" label="Statut" options={STATUT_OPTIONS} value={statut} onChange={(e) => setStatut(e.target.value)} />
        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
        <div className="flex items-center justify-end gap-space-2 mt-space-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button type="submit" variant="primary" disabled={pending}>{editing ? 'Enregistrer' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  )
}
