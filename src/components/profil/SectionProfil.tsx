'use client'

import { useState } from 'react'
import { Card, Button, Input, Select } from '@/components/ui'
import {
  NIVEAU_ETUDE_OPTIONS,
  SITUATION_EMPLOI_OPTIONS,
  HANDICAP_OPTIONS,
  ZONE_HABITATION_OPTIONS,
  niveauLabel,
  situationLabel,
  handicapLabel,
  zoneLabel,
} from '@/lib/profil-constants'
import type { ProfilComplet, PutProfilResponse } from '@/types/profil'

interface Props {
  data: ProfilComplet['profil']
  onSaved: (data: PutProfilResponse) => void
}

/**
 * GUIC-689 — Les domaines d'intérêt et les compétences ont QUITTÉ cette carte.
 * Ils s'éditent désormais là où ils s'affichent : « Objectif & secteurs visés »
 * pour les premiers, « Compétences & langues » pour les secondes. Les garder
 * ici obligeait à voir une valeur à un endroit et à la chercher à un autre.
 */
export function SectionProfil({ data, onSaved }: Props) {
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  const [displayed, setDisplayed] = useState({
    biographie:      data?.biographie      ?? null as string | null,
    niveauEtude:     data?.niveauEtude     ?? null as string | null,
    situationEmploi: data?.situationEmploi ?? null as string | null,
    situationHandicap: data?.situationHandicap ?? null as string | null,
    zoneHabitation:    data?.zoneHabitation    ?? null as string | null,
  })

  const [form, setForm] = useState({
    biographie:      data?.biographie      ?? '',
    niveauEtude:     data?.niveauEtude     ?? '',
    situationEmploi: data?.situationEmploi ?? '',
    situationHandicap: data?.situationHandicap ?? '',
    zoneHabitation:    data?.zoneHabitation    ?? '',
  })

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          biographie:      form.biographie      || null,
          niveauEtude:     form.niveauEtude     || null,
          situationEmploi: form.situationEmploi || null,
          situationHandicap: form.situationHandicap || null,
          zoneHabitation:    form.zoneHabitation    || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur')
      const saved = json.data as PutProfilResponse
      setDisplayed({
        biographie:      saved.biographie,
        niveauEtude:     saved.niveauEtude,
        situationEmploi: saved.situationEmploi,
        situationHandicap: saved.situationHandicap,
        zoneHabitation:    saved.zoneHabitation,
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
        <h2 className="text-fs-400 font-bold text-color-text-primary">Profil</h2>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
        )}
      </div>

      {!editing ? (
        <div className="flex flex-col gap-space-3 text-fs-300">
          <p className="text-color-text-secondary italic">
            {displayed.biographie ?? 'Aucune biographie renseignée.'}
          </p>
          {displayed.niveauEtude && (
            <div className="flex gap-space-2">
              <span className="text-color-text-secondary">Niveau d&apos;étude :</span>
              <span className="font-medium text-color-text-primary">{niveauLabel(displayed.niveauEtude)}</span>
            </div>
          )}
          {displayed.situationEmploi && (
            <div className="flex gap-space-2">
              <span className="text-color-text-secondary">Situation :</span>
              <span className="font-medium text-color-text-primary">{situationLabel(displayed.situationEmploi)}</span>
            </div>
          )}
          {displayed.zoneHabitation && (
            <div className="flex gap-space-2">
              <span className="text-color-text-secondary">Zone d&apos;habitation :</span>
              <span className="font-medium text-color-text-primary">{zoneLabel(displayed.zoneHabitation)}</span>
            </div>
          )}
          {displayed.situationHandicap && (
            <div className="flex gap-space-2">
              <span className="text-color-text-secondary">Situation de handicap :</span>
              <span className="font-medium text-color-text-primary">{handicapLabel(displayed.situationHandicap)}</span>
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

          <Select
            id="niveauEtude"
            label="Niveau d'étude"
            options={NIVEAU_ETUDE_OPTIONS as unknown as { value: string; label: string }[]}
            placeholder="Sélectionner…"
            value={form.niveauEtude}
            onChange={e => setForm(f => ({ ...f, niveauEtude: e.target.value }))}
          />

          <Select
            id="situationEmploi"
            label="Situation professionnelle"
            options={SITUATION_EMPLOI_OPTIONS as unknown as { value: string; label: string }[]}
            placeholder="Sélectionner…"
            value={form.situationEmploi}
            onChange={e => setForm(f => ({ ...f, situationEmploi: e.target.value }))}
          />

          <Select
            id="zoneHabitation"
            label="Zone d'habitation"
            options={ZONE_HABITATION_OPTIONS as unknown as { value: string; label: string }[]}
            placeholder="Non renseigné"
            value={form.zoneHabitation}
            onChange={e => setForm(f => ({ ...f, zoneHabitation: e.target.value }))}
          />

          <Select
            id="situationHandicap"
            label="Situation de handicap"
            options={HANDICAP_OPTIONS as unknown as { value: string; label: string }[]}
            placeholder="Non renseigné"
            value={form.situationHandicap}
            onChange={e => setForm(f => ({ ...f, situationHandicap: e.target.value }))}
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
