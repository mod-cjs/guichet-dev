'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import {
  slotRequirements,
  type ModelMeta,
  type LlmSlot,
} from '@/lib/ia/supported-models'
import type { LlmConfigValues } from '@/lib/ia/llm-config'
import type { SlotParams } from '@/lib/ia/llm-params'

type LlmParamsValues = Record<LlmSlot, SlotParams>
interface Bornes { tempMin: number; tempMax: number; tokensMin: number; tokensMax: number }

const SLOTS: { key: LlmSlot; titre: string; desc: string; tempLabel: string; tempNote: string }[] = [
  { key: 'agent', titre: 'Yaye (agent conversationnel)', desc: 'Temps réel web + WhatsApp. Exige outils + streaming.',
    tempLabel: 'Température de réponse', tempNote: 'Ton de la réponse finale : ↑ = plus chaleureux/varié, ↓ = plus factuel. (La température de décision d’outil reste fixe pour la fiabilité.)' },
  { key: 'judge', titre: 'Juge (évaluation qualité)', desc: 'Notation des transcripts (cron).',
    tempLabel: 'Température', tempNote: '0 recommandé — une notation déterministe est plus fiable.' },
  { key: 'adequation', titre: 'Score d’adéquation', desc: 'Matching candidat / offre (recruteur).',
    tempLabel: 'Température', tempNote: '0 recommandé — un score déterministe est reproductible.' },
]

/** Un modèle est-il éligible à un slot ? (mêmes règles que le serveur). */
function eligible(meta: ModelMeta, slot: LlmSlot): boolean {
  const req = slotRequirements(slot)
  return (Object.entries(req) as [keyof ModelMeta['caps'], boolean][]).every(
    ([cap, needed]) => !needed || meta.caps[cap],
  )
}

/** Famille lisible du modèle (badge) à partir de l'id. */
function famille(id: string): string {
  if (id.includes('gemma')) return 'Gemma'
  if (id.includes('gemini')) return 'Gemini'
  if (id.includes('llama')) return 'Llama'
  return 'Vertex'
}

export function ModeleForm({
  initialConfig,
  initialParams,
  bornes,
  models,
}: {
  initialConfig: LlmConfigValues
  initialParams: LlmParamsValues
  bornes: Bornes
  models: readonly ModelMeta[]
}) {
  const [config, setConfig] = useState<LlmConfigValues>(initialConfig)
  const [params, setParams] = useState<LlmParamsValues>(initialParams)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const modelsDirty =
    config.agent !== initialConfig.agent ||
    config.judge !== initialConfig.judge ||
    config.adequation !== initialConfig.adequation
  const paramsDirty = (['agent', 'judge', 'adequation'] as LlmSlot[]).some(
    s => params[s].temperature !== initialParams[s].temperature || params[s].maxTokens !== initialParams[s].maxTokens,
  )
  const dirty = modelsDirty || paramsDirty

  function setParam(slot: LlmSlot, field: keyof SlotParams, value: number) {
    setParams(p => ({ ...p, [slot]: { ...p[slot], [field]: value } }))
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/ia/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, params }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage({ kind: 'error', text: json?.error?.message ?? 'Échec de l’enregistrement.' })
      } else {
        setConfig(json.data.config)
        if (json.data.params) setParams(json.data.params)
        setMessage({ kind: 'ok', text: 'Configuration enregistrée.' })
      }
    } catch {
      setMessage({ kind: 'error', text: 'Erreur réseau — réessaie.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-4">
      {SLOTS.map(({ key, titre, desc, tempLabel, tempNote }) => {
        const options = models
          .filter(m => eligible(m, key))
          .map(m => ({ value: m.id, label: m.label }))
        const selected = models.find(m => m.id === config[key])
        const p = params[key]
        return (
          <Card key={key} className="flex flex-col gap-space-2">
            <div className="flex flex-col gap-space-1">
              <h2 className="text-fs-400 font-bold text-color-text-primary">{titre}</h2>
              <p className="text-fs-200 text-color-text-secondary">{desc}</p>
            </div>
            <Select
              id={`model-${key}`}
              label="Modèle"
              options={options}
              value={config[key]}
              onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
            />
            {selected?.note && (
              <p className="text-fs-200 text-color-text-secondary">{selected.note}</p>
            )}
            {!selected && (
              <p className="text-fs-200 text-gj-red">
                Modèle actuel « {config[key]} » hors allowlist — choisis-en un dans la liste.
              </p>
            )}

            {/* Paramètres d'échantillonnage pilotables et bornés (GUIC-537) */}
            <div className="flex flex-col gap-space-2 border-t border-gj-line pt-space-2">
              <div className="flex flex-col gap-space-1">
                <label htmlFor={`temp-${key}`} className="flex items-center justify-between text-fs-200 font-bold text-color-text-primary">
                  <span>{tempLabel}</span>
                  <span className="tabular-nums text-gj-teal-deep">{p.temperature.toFixed(2)}</span>
                </label>
                <input
                  id={`temp-${key}`}
                  type="range"
                  min={bornes.tempMin}
                  max={bornes.tempMax}
                  step={0.05}
                  value={p.temperature}
                  onChange={e => setParam(key, 'temperature', Number(e.target.value))}
                  className="w-full accent-gj-teal"
                />
                <p className="text-fs-100 text-color-text-secondary">{tempNote}</p>
              </div>
              <div className="flex flex-col gap-space-1">
                <label htmlFor={`tokens-${key}`} className="text-fs-200 font-bold text-color-text-primary">
                  Longueur max (tokens)
                </label>
                <input
                  id={`tokens-${key}`}
                  type="number"
                  min={bornes.tokensMin}
                  max={bornes.tokensMax}
                  step={16}
                  value={p.maxTokens}
                  onChange={e => setParam(key, 'maxTokens', Number(e.target.value))}
                  className="w-[140px] rounded-gj-sm border-[1.5px] border-gj-line bg-color-surface px-space-2 py-space-1 text-fs-300 tabular-nums text-color-text-primary"
                />
                <p className="text-fs-100 text-color-text-secondary">
                  Borné {bornes.tokensMin}–{bornes.tokensMax}. Trop haut = coût/latence inutiles et risque de troncature.
                </p>
              </div>
            </div>
          </Card>
        )
      })}

      <Card className="flex flex-col gap-space-2">
        <h2 className="text-fs-400 font-bold text-color-text-primary">Guide des modèles</h2>
        <p className="text-fs-200 text-color-text-secondary">
          Fournisseur : Vertex AI (GCP). Description et avantages de chaque modèle disponible.
        </p>
        <ul className="flex flex-col gap-space-2">
          {models.map(m => (
            <li key={m.id} className="flex flex-col gap-space-1 border-t border-gj-line pt-space-2 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-space-1">
                <span className="text-fs-300 font-bold text-color-text-primary">{m.label}</span>
                <span className="text-fs-100 font-bold text-gj-teal-deep bg-[var(--focus-ring-soft)] rounded-gj-sm px-space-1">
                  {famille(m.id)}
                </span>
                {m.deployed && (
                  <span className="text-fs-100 font-bold text-gj-red">endpoint dédié requis</span>
                )}
              </div>
              {m.note && <p className="text-fs-200 text-color-text-secondary">{m.note}</p>}
              <code className="text-fs-100 text-color-text-secondary">{m.id}</code>
            </li>
          ))}
        </ul>
      </Card>

      {message && (
        <p className={`text-fs-300 ${message.kind === 'ok' ? 'text-gj-teal-deep' : 'text-gj-red'}`}>
          {message.text}
        </p>
      )}

      <div>
        <Button onClick={save} loading={saving} disabled={!dirty || saving}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}
