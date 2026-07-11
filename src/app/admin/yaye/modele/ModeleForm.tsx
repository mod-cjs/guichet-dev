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

const SLOTS: { key: LlmSlot; titre: string; desc: string }[] = [
  { key: 'agent', titre: 'Yaye (agent conversationnel)', desc: 'Temps réel web + WhatsApp. Exige outils + streaming.' },
  { key: 'judge', titre: 'Juge (évaluation qualité)', desc: 'Notation des transcripts (cron).' },
  { key: 'adequation', titre: 'Score d’adéquation', desc: 'Matching candidat / offre (recruteur).' },
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
  models,
}: {
  initialConfig: LlmConfigValues
  models: readonly ModelMeta[]
}) {
  const [config, setConfig] = useState<LlmConfigValues>(initialConfig)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const dirty =
    config.agent !== initialConfig.agent ||
    config.judge !== initialConfig.judge ||
    config.adequation !== initialConfig.adequation

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/ia/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage({ kind: 'error', text: json?.error?.message ?? 'Échec de l’enregistrement.' })
      } else {
        setConfig(json.data.config)
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
      {SLOTS.map(({ key, titre, desc }) => {
        const options = models
          .filter(m => eligible(m, key))
          .map(m => ({ value: m.id, label: m.label }))
        const selected = models.find(m => m.id === config[key])
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
