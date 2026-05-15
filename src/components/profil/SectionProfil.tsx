'use client'

import { useState } from 'react'
import { Card, Button, Input } from '@/components/ui'
import type { ProfilComplet } from '@/app/api/profil/route'

const NIVEAUX = [
  'Sans diplôme','BFEM','BAC','BTS','Licence','Master','Doctorat','Formation professionnelle',
].map(v => v)

const SITUATIONS = [
  'En recherche d\'emploi','En emploi','En stage','En formation','Entrepreneur','Autre',
]

const DOMAINES = [
  'Agriculture','Numérique','Entrepreneuriat','Citoyenneté','Environnement','Santé','Éducation','Culture','Autre',
]

interface Props {
  data: ProfilComplet['profil']
  onSaved: (score: number) => void
}

export function SectionProfil({ data, onSaved }: Props) {
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    biographie:      data?.biographie      ?? '',
    niveauEtude:     data?.niveauEtude     ?? '',
    situationEmploi: data?.situationEmploi ?? '',
    domainesInteret: data?.domainesInteret ?? [] as string[],
    competences:     (data?.competences ?? []).join(', '),
  })

  function toggleDomaine(d: string) {
    setForm(f => ({
      ...f,
      domainesInteret: f.domainesInteret.includes(d)
        ? f.domainesInteret.filter(x => x !== d)
        : [...f.domainesInteret, d],
    }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const competences = form.competences.split(',').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          biographie:      form.biographie      || null,
          niveauEtude:     form.niveauEtude     || null,
          situationEmploi: form.situationEmploi || null,
          domainesInteret: form.domainesInteret,
          competences,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur')
      onSaved(json.data.completionScore)
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
        <h2 className="text-fs-400 font-bold text-color-text-primary">Profil</h2>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
        )}
      </div>

      {!editing ? (
        <div className="flex flex-col gap-space-3 text-fs-300">
          <p className="text-color-text-secondary italic">
            {data?.biographie ?? 'Aucune biographie renseignée.'}
          </p>
          {data?.niveauEtude && (
            <div className="flex gap-space-2">
              <span className="text-color-text-secondary">Niveau d&apos;étude :</span>
              <span className="font-medium text-color-text-primary">{data.niveauEtude}</span>
            </div>
          )}
          {data?.situationEmploi && (
            <div className="flex gap-space-2">
              <span className="text-color-text-secondary">Situation :</span>
              <span className="font-medium text-color-text-primary">{data.situationEmploi}</span>
            </div>
          )}
          {(data?.domainesInteret ?? []).length > 0 && (
            <div>
              <p className="text-color-text-secondary mb-space-2">Domaines d&apos;intérêt</p>
              <div className="flex flex-wrap gap-space-2">
                {data!.domainesInteret.map(d => (
                  <span key={d} className="px-space-3 py-space-1 rounded-full text-fs-200 bg-gj-teal-soft text-gj-teal-deep font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(data?.competences ?? []).length > 0 && (
            <div>
              <p className="text-color-text-secondary mb-space-2">Compétences</p>
              <div className="flex flex-wrap gap-space-2">
                {data!.competences.map(c => (
                  <span key={c} className="px-space-3 py-space-1 rounded-full text-fs-200 bg-gj-bg text-color-text-primary border border-gj-line">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-space-4">
          <div className="flex flex-col gap-space-1">
            <label htmlFor="bio" className="text-fs-300 font-bold text-color-text-primary">Biographie</label>
            <textarea
              id="bio"
              rows={4}
              maxLength={2000}
              value={form.biographie}
              onChange={e => setForm(f => ({ ...f, biographie: e.target.value }))}
              placeholder="Parlez de vous en quelques lignes..."
              className="w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
                focus:border-gj-teal-deep focus:outline-none focus:ring-[3px] focus:ring-[rgba(0,178,135,.18)]
                text-[16px] font-[inherit] resize-none"
            />
            <p className="text-fs-200 text-color-text-secondary text-right">{form.biographie.length}/2000</p>
          </div>

          <div className="flex flex-col gap-space-1">
            <label className="text-fs-300 font-bold text-color-text-primary">Niveau d&apos;étude</label>
            <div className="flex flex-wrap gap-space-2">
              {NIVEAUX.map(n => (
                <button
                  key={n} type="button"
                  onClick={() => setForm(f => ({ ...f, niveauEtude: f.niveauEtude === n ? '' : n }))}
                  className={`px-space-3 py-space-1 rounded-full text-fs-200 border transition-colors
                    ${form.niveauEtude === n
                      ? 'bg-gj-teal text-white border-gj-teal'
                      : 'bg-white text-color-text-primary border-gj-line hover:border-gj-teal'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-space-1">
            <label className="text-fs-300 font-bold text-color-text-primary">Situation professionnelle</label>
            <div className="flex flex-wrap gap-space-2">
              {SITUATIONS.map(s => (
                <button
                  key={s} type="button"
                  onClick={() => setForm(f => ({ ...f, situationEmploi: f.situationEmploi === s ? '' : s }))}
                  className={`px-space-3 py-space-1 rounded-full text-fs-200 border transition-colors
                    ${form.situationEmploi === s
                      ? 'bg-gj-teal text-white border-gj-teal'
                      : 'bg-white text-color-text-primary border-gj-line hover:border-gj-teal'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-space-1">
            <label className="text-fs-300 font-bold text-color-text-primary">Domaines d&apos;intérêt</label>
            <div className="flex flex-wrap gap-space-2">
              {DOMAINES.map(d => (
                <button
                  key={d} type="button"
                  onClick={() => toggleDomaine(d)}
                  className={`px-space-3 py-space-1 rounded-full text-fs-200 border transition-colors
                    ${form.domainesInteret.includes(d)
                      ? 'bg-gj-teal text-white border-gj-teal'
                      : 'bg-white text-color-text-primary border-gj-line hover:border-gj-teal'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <Input
            id="competences" label="Compétences (séparées par des virgules)"
            value={form.competences}
            placeholder="Ex : JavaScript, Gestion de projet, Communication"
            onChange={e => setForm(f => ({ ...f, competences: e.target.value }))}
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
