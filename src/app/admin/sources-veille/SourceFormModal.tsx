'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { LIBELLES_METHODE, LIBELLES_FREQUENCE, LIBELLES_TYPE_DEFAUT } from './libelles'

/** Méthodes dont la configuration (sélecteurs / paramètres) est obligatoire. */
const METHODES_AVEC_CONFIG = ['api', 'html_selecteurs']

export interface SourceFormValues {
  id?: string
  nom?: string
  url?: string
  methode?: string
  frequence?: string
  actif?: boolean
  typeDefaut?: string | null
  configExtraction?: Record<string, unknown> | null
}

export interface SourceFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** Présent (avec id) = édition ; absent = création. */
  source?: SourceFormValues
}

// Options dérivées des libellés (déjà en ordre de cascade) — ce composant client
// n'importe PAS le module zod, qui tire `@prisma/client` (interdit côté navigateur).
const METHODE_OPTIONS = Object.entries(LIBELLES_METHODE).map(([value, label]) => ({ value, label }))
const FREQUENCE_OPTIONS = Object.entries(LIBELLES_FREQUENCE).map(([value, label]) => ({ value, label }))
const TYPE_OPTIONS = [
  { value: '', label: '— Aucun (déterminé à l’extraction)' },
  ...Object.entries(LIBELLES_TYPE_DEFAUT).map(([value, label]) => ({ value, label })),
]

export function SourceFormModal({ isOpen, onClose, source }: SourceFormModalProps) {
  const editing = Boolean(source?.id)
  const [nom, setNom] = useState('')
  const [url, setUrl] = useState('')
  const [methode, setMethode] = useState('auto')
  const [frequence, setFrequence] = useState('quotidienne')
  const [typeDefaut, setTypeDefaut] = useState('')
  const [config, setConfig] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Ré-initialise le formulaire à chaque ouverture (création ou édition d'une autre source).
  useEffect(() => {
    if (!isOpen) return
    setNom(source?.nom ?? '')
    setUrl(source?.url ?? '')
    setMethode(source?.methode ?? 'auto')
    setFrequence(source?.frequence ?? 'quotidienne')
    setTypeDefaut(source?.typeDefaut ?? '')
    setConfig(source?.configExtraction ? JSON.stringify(source.configExtraction, null, 2) : '')
    setError(null)
  }, [isOpen, source])

  const configRequise = METHODES_AVEC_CONFIG.includes(methode)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    let configExtraction: Record<string, unknown> | undefined
    if (config.trim()) {
      try {
        const parsed: unknown = JSON.parse(config)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
        configExtraction = parsed as Record<string, unknown>
      } catch {
        setError('Configuration invalide : un objet JSON est attendu (ex. { "liste": ".offres li" }).')
        return
      }
    } else if (configRequise) {
      setError(`La configuration est requise pour la méthode « ${LIBELLES_METHODE[methode]} ».`)
      return
    }

    const payload = {
      nom,
      url,
      methode,
      frequence,
      ...(typeDefaut ? { typeDefaut } : {}),
      ...(configExtraction ? { configExtraction } : {}),
    }

    startTransition(async () => {
      const res = await fetch(
        editing && source?.id
          ? `/api/admin/sources-veille/${source.id}`
          : '/api/admin/sources-veille',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      if (res.ok) {
        onClose()
        return
      }
      const body = (await res.json().catch(() => null)) as {
        error?: { code?: string; message?: string }
      } | null
      if (body?.error?.code === 'URL_EXISTANTE')
        setError('Cette URL est déjà déclarée comme source.')
      else setError(body?.error?.message ?? 'Échec — vérifie le nom et l’URL.')
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Modifier la source' : 'Nouvelle source de veille'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-3">
        <Input
          id="source-nom"
          label="Nom (ex. ANPEJ — offres d’emploi)"
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <Input
          id="source-url"
          label="URL surveillée (http(s))"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Select
          id="source-methode"
          label="Méthode d’extraction"
          options={METHODE_OPTIONS}
          value={methode}
          onChange={(e) => setMethode(e.target.value)}
        />
        <Select
          id="source-frequence"
          label="Fréquence de vérification"
          options={FREQUENCE_OPTIONS}
          value={frequence}
          onChange={(e) => setFrequence(e.target.value)}
        />
        <Select
          id="source-type"
          label="Type d’opportunité par défaut"
          options={TYPE_OPTIONS}
          value={typeDefaut}
          onChange={(e) => setTypeDefaut(e.target.value)}
        />
        <Textarea
          id="source-config"
          label={
            configRequise
              ? 'Configuration (JSON — requise pour cette méthode)'
              : 'Configuration (JSON — optionnelle)'
          }
          rows={4}
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          placeholder='{ "liste": ".offres article", "titre": "h3 a", "lien": "h3 a@href" }'
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
            {editing ? 'Enregistrer' : 'Créer la source'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
