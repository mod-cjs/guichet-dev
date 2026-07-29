'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { ProgrammesField, type ProgrammeOption } from '@/components/admin/ProgrammesField'
import { creerRessource, modifierRessource } from './actions'
import type { RessourceRow } from './AdminRessourcesTable'

const TYPE_OPTIONS = (['PDF', 'Video', 'Lien', 'Guide', 'Outil'] as const).map((v) => ({ value: v, label: v }))
const STATUT_OPTIONS = [
  { value: 'true', label: 'Publié' },
  { value: 'false', label: 'Brouillon' },
]

export interface RessourceFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** Présent = édition ; absent = création. */
  ressource?: RessourceRow
  /** Appelé après succès (création/édition) — la liste affiche un toast. */
  onSuccess?: (action: 'create' | 'update') => void
  /** Programmes actifs proposés au rattachement (GUIC-684). */
  programmes?: ProgrammeOption[]
}

export function RessourceFormModal({
  isOpen,
  onClose,
  ressource,
  onSuccess,
  programmes = [],
}: RessourceFormModalProps) {
  const editing = Boolean(ressource)
  const [titre, setTitre] = useState(ressource?.titre ?? '')
  const [description, setDescription] = useState(ressource?.description ?? '')
  const [type, setType] = useState<string>(ressource?.type ?? 'PDF')
  const [theme, setTheme] = useState(ressource?.theme ?? '')
  const [url, setUrl] = useState(ressource?.url ?? '')
  const [categorie, setCategorie] = useState(ressource?.categorie ?? '')
  const [estPublic, setEstPublic] = useState(ressource?.estPublic ?? true)
  // GUIC-684 — rattachement obligatoire (vide pour une ressource antérieure au ticket).
  const [programmeSlugs, setProgrammeSlugs] = useState<string[]>(ressource?.programmeSlugs ?? [])
  const [programmePrincipal, setProgrammePrincipal] = useState<string | null>(
    ressource?.programmePrincipalSlug ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input = {
      titre,
      description,
      type: type as RessourceRow['type'],
      theme,
      url,
      categorie: categorie.trim() || null,
      estPublic,
      programmeSlugs,
      programmePrincipalSlug: programmePrincipal,
    }
    // Garde côté client — le serveur refuse aussi (PROGRAMME_REQUIS).
    if (programmeSlugs.length === 0) {
      setError('Sélectionne au moins un programme de rattachement.')
      return
    }
    startTransition(async () => {
      try {
        if (editing && ressource) {
          await modifierRessource(ressource.id, input)
          onSuccess?.('update')
        } else {
          await creerRessource(input)
          onSuccess?.('create')
        }
        onClose()
      } catch {
        setError('Échec de l\'enregistrement — vérifie les champs requis et une URL valide.')
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Modifier la ressource' : 'Ajouter une ressource'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-3">
        <Input id="ress-titre" label="Titre" required value={titre} onChange={(e) => setTitre(e.target.value)} />
        <RichTextEditor id="ress-description" label="Description" value={description} onChange={setDescription} />
        <Select id="ress-type" label="Type" options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value)} />
        <Input id="ress-theme" label="Thème" required value={theme} onChange={(e) => setTheme(e.target.value)} />
        <Input id="ress-url" label="URL" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} />
        <Input id="ress-categorie" label="Catégorie" value={categorie} onChange={(e) => setCategorie(e.target.value)} />
        <ProgrammesField
          options={programmes}
          value={programmeSlugs}
          onChange={setProgrammeSlugs}
          principal={programmePrincipal}
          onPrincipalChange={setProgrammePrincipal}
        />
        <Select
          id="ress-statut"
          label="Statut"
          options={STATUT_OPTIONS}
          value={String(estPublic)}
          onChange={(e) => setEstPublic(e.target.value === 'true')}
        />
        {error && (
          <p role="alert" className="text-fs-200 text-gj-red font-bold">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-space-2 mt-space-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
