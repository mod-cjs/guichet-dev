'use client'

/**
 * GUIC-684 — Sélection des programmes de rattachement (admin).
 *
 * Partagé par les 3 formulaires (opportunités, ressources, événements) : le
 * rattachement est M:N côté base, mais le cas courant reste « un seul programme ».
 * L'UI est donc calibrée sur ce cas : un clic suffit, et le premier sélectionné
 * devient principal automatiquement — aucune décision supplémentaire imposée.
 *
 * Le choix du principal n'apparaît qu'à partir de 2 programmes sélectionnés, là
 * où il commence à avoir un sens (badge de carte, `programme_slug` du Data Hub).
 */

import { Chip } from '@/components/ui/Chip'
import { FieldLabel } from '@/components/ui/FieldLabel'

export interface ProgrammeOption {
  slug: string
  nom: string
}

export interface ProgrammesFieldProps {
  /** Programmes actifs proposés (source : table `Programme`). */
  options: ProgrammeOption[]
  /** Slugs sélectionnés — l'ordre porte le principal par défaut (le premier). */
  value: string[]
  onChange: (slugs: string[]) => void
  /** Slug du principal ; `null` → le premier de `value`. */
  principal?: string | null
  onPrincipalChange?: (slug: string) => void
  /** Message d'erreur (ex. aucun programme sélectionné). */
  error?: string | null
}

export function ProgrammesField({
  options,
  value,
  onChange,
  principal,
  onPrincipalChange,
  error,
}: ProgrammesFieldProps) {
  const principalEffectif = principal && value.includes(principal) ? principal : (value[0] ?? null)

  function toggle(slug: string) {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug])
  }

  return (
    <fieldset className="flex flex-col gap-space-2 border-0 p-0 m-0">
      <FieldLabel htmlFor="programmes-field" required>
        Programmes de rattachement
      </FieldLabel>
      <div id="programmes-field" role="group" aria-label="Programmes de rattachement" className="flex flex-wrap gap-2">
        {options.map((p) => (
          <Chip key={p.slug} selected={value.includes(p.slug)} onClick={() => toggle(p.slug)}>
            {p.nom}
          </Chip>
        ))}
      </div>

      {value.length > 1 && onPrincipalChange ? (
        <div className="flex flex-col gap-space-1">
          <FieldLabel htmlFor="programme-principal-field">Programme principal</FieldLabel>
          <div
            id="programme-principal-field"
            role="group"
            aria-label="Programme principal"
            className="flex flex-wrap gap-2"
          >
            {value.map((slug) => {
              const opt = options.find((o) => o.slug === slug)
              return (
                <Chip
                  key={slug}
                  selected={principalEffectif === slug}
                  onClick={() => onPrincipalChange(slug)}
                >
                  {opt?.nom ?? slug}
                </Chip>
              )
            })}
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-fs-200 text-gj-red">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
