'use client'

import { useState } from 'react'
import { Card, Button, Input, Select } from '@/components/ui'
import type { ProfilComplet, PutProfilResponse } from '@/types/profil'

const REGIONS = [
  'Dakar','Thies','Diourbel','Fatick','Kaolack','Kaffrine',
  'Louga','Saint_Louis','Matam','Tambacounda','Kedougou','Kolda','Ziguinchor','Sedhiou',
].map(r => ({ value: r, label: r.replace('_', '-') }))

interface Props {
  data: Pick<ProfilComplet, 'nom' | 'prenom' | 'email' | 'telephone' | 'region' | 'commune' | 'genre' | 'dateNaissance'>
  onSaved: (data: PutProfilResponse) => void
}

export function SectionIdentite({ data, onSaved }: Props) {
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState<string | null>(null)

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
          <p className="text-fs-200 text-color-text-secondary">
            Nom, email et téléphone sont gérés par le compte CJS.
          </p>
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
