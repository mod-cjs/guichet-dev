'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { creerType, modifierType } from './actions'

const BOOL_OPTIONS = [
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' },
]
const ACTIF_OPTIONS = [
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

/** Valeurs initiales pour l'édition (champs réels du modèle OpportuniteType). */
export interface TypeFormValues {
  id?: string
  slug?: string
  libelle?: string
  actionLabel?: string
  requiresFileUpload?: boolean
  fileLabel?: string | null
  decisionAuthority?: string | null
  actif?: boolean
  ordre?: number
}

export interface TypeFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** Présent (avec id) = édition ; absent = création. */
  type?: TypeFormValues
}

/** Slugifie une saisie libre vers le format attendu (minuscules, _ séparateur). */
function slugify(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

export function TypeFormModal({ isOpen, onClose, type }: TypeFormModalProps) {
  const editing = Boolean(type?.id)
  const [libelle, setLibelle] = useState(type?.libelle ?? '')
  const [slug, setSlug] = useState(type?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(false)
  const [actionLabel, setActionLabel] = useState(type?.actionLabel ?? '')
  const [requiresFileUpload, setRequiresFileUpload] = useState(type?.requiresFileUpload ?? false)
  const [fileLabel, setFileLabel] = useState(type?.fileLabel ?? '')
  const [decisionAuthority, setDecisionAuthority] = useState(type?.decisionAuthority ?? '')
  const [actif, setActif] = useState(type?.actif ?? true)
  const [ordre, setOrdre] = useState(type?.ordre != null ? String(type.ordre) : '0')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // À la création, dérive le slug du libellé tant que l'utilisateur ne l'a pas édité.
  function onLibelleChange(v: string) {
    setLibelle(v)
    if (!editing && !slugTouched) setSlug(slugify(v))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const common = {
      libelle,
      actionLabel,
      requiresFileUpload,
      fileLabel: fileLabel.trim() || null,
      decisionAuthority: decisionAuthority.trim() || null,
      actif,
      ordre: Number(ordre),
    }
    startTransition(async () => {
      try {
        if (editing && type?.id) await modifierType(type.id, common)
        else await creerType({ ...common, slug })
        onClose()
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'SLUG_EXISTANT') setError('Ce slug existe déjà — choisis-en un autre.')
        else setError('Échec — vérifie le libellé, le slug (minuscules/_), le bouton et l’ordre.')
      }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Modifier le type' : 'Nouveau type d’opportunité'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-3">
        <Input
          id="type-libelle"
          label="Libellé"
          required
          value={libelle}
          onChange={(e) => onLibelleChange(e.target.value)}
        />
        <Input
          id="type-slug"
          label="Slug (identifiant stable — non modifiable après création)"
          required
          value={slug}
          disabled={editing}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
        />
        <Input
          id="type-action"
          label="Libellé du bouton (ex. Postuler, S’inscrire)"
          required
          value={actionLabel}
          onChange={(e) => setActionLabel(e.target.value)}
        />
        <Select
          id="type-file"
          label="Dépôt de fichier requis ?"
          options={BOOL_OPTIONS}
          value={String(requiresFileUpload)}
          onChange={(e) => setRequiresFileUpload(e.target.value === 'true')}
        />
        <Input
          id="type-filelabel"
          label="Libellé du fichier (ex. CV (PDF))"
          value={fileLabel ?? ''}
          onChange={(e) => setFileLabel(e.target.value)}
        />
        <Input
          id="type-decision"
          label="Autorité de décision (ex. recruteur, commission, auto)"
          value={decisionAuthority ?? ''}
          onChange={(e) => setDecisionAuthority(e.target.value)}
        />
        <Input
          id="type-ordre"
          label="Ordre d’affichage"
          type="number"
          min={0}
          required
          value={ordre}
          onChange={(e) => setOrdre(e.target.value)}
        />
        <Select
          id="type-actif"
          label="Statut"
          options={ACTIF_OPTIONS}
          value={String(actif)}
          onChange={(e) => setActif(e.target.value === 'true')}
        />
        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
        <div className="flex items-center justify-end gap-space-2 mt-space-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {editing ? 'Enregistrer' : 'Créer le type'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
