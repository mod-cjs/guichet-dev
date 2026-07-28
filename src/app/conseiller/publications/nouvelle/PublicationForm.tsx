'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TypeEvenement } from '@prisma/client'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { creerPublication } from '../actions'
import { ProgrammesField, type ProgrammeOption } from '@/components/admin/ProgrammesField'

const TYPE_OPTIONS = (['Atelier', 'Formation', 'Forum', 'Conference', 'Webinar', 'Cours'] as const).map((v) => ({ value: v, label: v }))
const TARIF_OPTIONS = [{ value: 'true', label: 'Gratuit' }, { value: 'false', label: 'Payant' }]

/** GUIC-477 — Formulaire complet de création d'une publication (éditeur riche). */
export function PublicationForm({ programmes = [] }: { programmes?: ProgrammeOption[] }) {
  const router = useRouter()
  const [titre, setTitre] = useState('')
  const [type, setType] = useState<string>('Atelier')
  const [description, setDescription] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [lieu, setLieu] = useState('')
  const [capacite, setCapacite] = useState('')
  const [gratuit, setGratuit] = useState(true)
  // GUIC-684 — la publication doit relever d'au moins un programme.
  const [programmeSlugs, setProgrammeSlugs] = useState<string[]>([])
  const [programmePrincipal, setProgrammePrincipal] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = () => {
    setError(null)
    if (programmeSlugs.length === 0) {
      setError('Sélectionne au moins un programme de rattachement.')
      return
    }
    start(async () => {
      const res = await creerPublication({
        titre,
        type: type as TypeEvenement,
        description,
        dateDebut,
        dateFin: dateFin.trim() ? dateFin : null,
        lieu,
        capaciteMax: capacite.trim() ? Number(capacite) : null,
        estGratuit: gratuit,
        programmeSlugs,
        programmePrincipalSlug: programmePrincipal,
      })
      if (res.error) setError(res.error.message)
      else router.push('/conseiller/publications')
    })
  }

  return (
    <div className="bg-white rounded-gj-lg p-space-5 flex flex-col gap-space-4" style={{ border: '1.5px solid var(--gj-line)' }}>
      <Input id="pub-titre" label="Titre" required value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Atelier CV & lettre de motivation" />
      {programmes.length > 0 && (
        <ProgrammesField
          options={programmes}
          value={programmeSlugs}
          onChange={setProgrammeSlugs}
          principal={programmePrincipal}
          onPrincipalChange={setProgrammePrincipal}
        />
      )}

      <RichTextEditor id="pub-description" label="Description" value={description} onChange={setDescription} />

      <div className="grid gap-space-4 grid-cols-1 sm:grid-cols-2">
        <Select id="pub-type" label="Type de publication" options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value)} />
        <Select id="pub-tarif" label="Tarif" options={TARIF_OPTIONS} value={String(gratuit)} onChange={(e) => setGratuit(e.target.value === 'true')} />
        <Input id="pub-date" label="Date de début" type="datetime-local" required value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
        <Input id="pub-datefin" label="Date de fin (facultatif)" type="datetime-local" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
        <Input id="pub-lieu" label="Lieu" required value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Ex. Salle A" />
        <Input id="pub-capacite" label="Capacité (facultatif)" type="number" min={1} value={capacite} onChange={(e) => setCapacite(e.target.value)} placeholder="Ex. 20" />
      </div>

      <div className="flex items-center gap-space-2" style={{ background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600 }}>
        <Icon name="info" size={15} className="shrink-0" /> Votre publication sera soumise à la validation de l&apos;administrateur avant d&apos;être visible.
      </div>

      {error && <p className="text-fs-200 m-0" style={{ color: 'var(--gj-red)' }}>{error}</p>}

      <div className="flex justify-end gap-space-2">
        <Button variant="secondary" onClick={() => router.push('/conseiller/publications')} disabled={pending}>Annuler</Button>
        <Button variant="primary" onClick={submit} loading={pending}>Soumettre pour validation</Button>
      </div>
    </div>
  )
}
