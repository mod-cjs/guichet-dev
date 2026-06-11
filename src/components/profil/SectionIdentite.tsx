'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Card, Button, Input, Select } from '@/components/ui'
import type { ProfilComplet, PutProfilResponse } from '@/types/profil'

const ALLOWED_PHOTO_MIME_CLIENT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES_CLIENT    = 5 * 1024 * 1024

/** Magic-bytes côté client (défense en profondeur, le serveur revalide). */
function clientHasValidMagic(mime: string, head: Uint8Array): boolean {
  if (mime === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  if (mime === 'image/png')  return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
  if (mime === 'image/webp') {
    return head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
      && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  }
  return false
}

const REGIONS = [
  'Dakar','Thies','Diourbel','Fatick','Kaolack','Kaffrine',
  'Louga','Saint_Louis','Matam','Tambacounda','Kedougou','Kolda','Ziguinchor','Sedhiou',
].map(r => ({ value: r, label: r.replace('_', '-') }))

interface Props {
  data:         Pick<ProfilComplet, 'nom' | 'prenom' | 'email' | 'telephone' | 'region' | 'commune' | 'genre' | 'dateNaissance'>
  photoUrl?:    string | null
  ssoProfilUrl: string | null
  onSaved:      (data: PutProfilResponse) => void
  onPhotoSaved?: (photoUrl: string) => void
}

export function SectionIdentite({ data, photoUrl, ssoProfilUrl, onSaved, onPhotoSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [photo,        setPhoto]        = useState<string | null>(photoUrl ?? null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError,   setPhotoError]   = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  const initiales = `${(data.prenom?.[0] ?? '').toUpperCase()}${(data.nom?.[0] ?? '').toUpperCase()}`

  async function uploadPhoto(file: File) {
    setPhotoError(null)

    if (!ALLOWED_PHOTO_MIME_CLIENT.includes(file.type)) {
      setPhotoError('Format invalide (JPEG, PNG ou WebP requis).')
      return
    }
    if (file.size > MAX_PHOTO_BYTES_CLIENT) {
      setPhotoError('Image trop volumineuse (5 MB max).')
      return
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    if (!clientHasValidMagic(file.type, head)) {
      setPhotoError("Le contenu du fichier ne correspond pas au format déclaré.")
      return
    }

    setPhotoLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/profil/photo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Upload impossible')
      setPhoto(json.data.photoUrl)
      onPhotoSaved?.(json.data.photoUrl)
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setPhotoLoading(false)
    }
  }

  const [displayed, setDisplayed] = useState({
    region:        data.region,
    commune:       data.commune,
    genre:         data.genre,
    dateNaissance: data.dateNaissance,
  })

  const [form, setForm] = useState({
    region:        data.region        ?? '',
    commune:       data.commune       ?? '',
    genre:         data.genre         ?? '',
    dateNaissance: data.dateNaissance ?? '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region:        form.region        || null,
          commune:       form.commune       || null,
          genre:         form.genre         || null,
          dateNaissance: form.dateNaissance || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur')
      const saved = json.data as PutProfilResponse
      setDisplayed({
        region:        saved.region,
        commune:       saved.commune,
        genre:         saved.genre,
        dateNaissance: saved.dateNaissance,
      })
      onSaved(saved)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-space-4">
        <h2 className="text-fs-400 font-bold text-color-text-primary">Identité</h2>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
        )}
      </div>

      {/* Photo de profil — GUIC-360 */}
      <div className="flex items-center gap-space-4 mb-space-4">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={photoLoading}
          className="relative w-[96px] h-[96px] rounded-full bg-gj-teal overflow-hidden flex items-center justify-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gj-teal-deep disabled:opacity-60"
          aria-label="Modifier la photo de profil"
        >
          {photo ? (
            <Image src={photo} alt="" width={96} height={96} className="w-full h-full object-cover" />
          ) : (
            <span className="text-fs-500 font-bold text-white">{initiales || '?'}</span>
          )}
        </button>
        <div className="flex flex-col gap-space-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => photoInputRef.current?.click()}
            loading={photoLoading}
            className="min-h-[44px]"
          >
            {photo ? 'Changer la photo' : 'Ajouter une photo'}
          </Button>
          <p className="text-fs-200 text-color-text-secondary">JPEG, PNG ou WebP · 5 MB max</p>
          {photoError && <p className="text-fs-200 text-gj-red">{photoError}</p>}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) void uploadPhoto(f)
            e.target.value = ''
          }}
        />
      </div>

      {!editing ? (
        <dl className="grid grid-cols-2 gap-x-space-4 gap-y-space-3 text-fs-300">
          <dt className="text-color-text-secondary">Nom complet</dt>
          <dd className="font-medium text-color-text-primary">{data.prenom} {data.nom}</dd>
          <dt className="text-color-text-secondary">Email</dt>
          <dd className="font-medium text-color-text-primary">{data.email ?? '—'}</dd>
          <dt className="text-color-text-secondary">Téléphone</dt>
          <dd className="font-medium text-color-text-primary">{data.telephone ?? '—'}</dd>
          <dt className="text-color-text-secondary">Région</dt>
          <dd className="font-medium text-color-text-primary">{displayed.region?.replace('_', '-') ?? '—'}</dd>
          <dt className="text-color-text-secondary">Commune</dt>
          <dd className="font-medium text-color-text-primary">{displayed.commune ?? '—'}</dd>
          <dt className="text-color-text-secondary">Genre</dt>
          <dd className="font-medium text-color-text-primary">{displayed.genre === 'M' ? 'Homme' : displayed.genre === 'F' ? 'Femme' : '—'}</dd>
          <dt className="text-color-text-secondary">Date de naissance</dt>
          <dd className="font-medium text-color-text-primary">{displayed.dateNaissance ?? '—'}</dd>
        </dl>
      ) : (
        <div className="flex flex-col gap-space-4">

          {/* Bloc coordonnées SSO — lecture seule */}
          <div className="rounded-gj-md bg-gj-bg border border-gj-line p-space-3 flex flex-col gap-space-2">
            <p className="text-fs-200 font-bold text-color-text-primary">
              Nom, email et téléphone
            </p>
            <p className="text-fs-200 text-color-text-secondary">
              Ces informations sont gérées sur votre compte CJS et synchronisées
              automatiquement à chaque connexion.
            </p>
            {ssoProfilUrl ? (
              <a
                href={ssoProfilUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fs-200 font-bold text-gj-teal-deep underline underline-offset-2 self-start"
              >
                Modifier sur mon compte CJS →
              </a>
            ) : (
              <p className="text-fs-200 text-color-text-secondary italic">
                Contactez le support CJS pour modifier ces informations.
              </p>
            )}
          </div>

          <Select
            id="region" label="Région" value={form.region}
            options={REGIONS} placeholder="Sélectionner une région"
            onChange={e => set('region', e.target.value)}
          />
          <Input
            id="commune" label="Commune" value={form.commune}
            placeholder="Ex : Médina"
            onChange={e => set('commune', e.target.value)}
          />
          <Select
            id="genre" label="Genre" value={form.genre}
            options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }]}
            placeholder="Sélectionner"
            onChange={e => set('genre', e.target.value)}
          />
          <Input
            id="dateNaissance" label="Date de naissance" type="date"
            value={form.dateNaissance}
            onChange={e => set('dateNaissance', e.target.value)}
          />
          {error && <p className="text-fs-200 text-gj-red">{error}</p>}
          <div className="flex gap-space-3">
            <Button onClick={save} loading={saving}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setError(null) }}>Annuler</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
