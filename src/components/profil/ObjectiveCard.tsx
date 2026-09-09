'use client'

import { useState } from 'react'
import { Region } from '@prisma/client'
import { Button, Icon } from '@/components/ui'
import { TYPES_RECHERCHES } from '@/app/api/profil/schema'
import { DOMAINES_INTERET } from '@/lib/profil-constants'
import { regionLabel } from '@/lib/regions'

export interface ObjectiveCardProps {
  objectif: string | null
  secteurs: string[]
  typesRecherches: string[]
  regionsMobilite: string[]
  /** Remonte le score recalculé par le serveur après enregistrement. */
  onSaved?: (data: { completionScore: number }) => void
}

/**
 * <ObjectiveCard /> — « Objectif & secteurs visés ».
 *
 * Réf `design-guichet-v5/profil-web.jsx` (`ObjectiveCard` L.505-544). Les
 * champs `objectif`, `types_recherches` et `regions_mobilite` ont été créés
 * pour cette carte ; `domaines_interet` portait déjà les secteurs, alimentés
 * par l'onboarding.
 *
 * Règle R3 du standard : un bloc dont la donnée manque ne s'affiche pas. Un
 * titre « Mobilité » suivi d'un tiret n'informe de rien et laisse croire à une
 * panne.
 */
const LIBELLE_TYPE: Record<string, string> = {
  emploi:       'Emploi',
  stage:        'Stage',
  formation:    'Formation',
  financement:  'Bourse / Financement',
  volontariat:  'Volontariat',
  entrepreneuriat: 'Entrepreneuriat',
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-grey m-0 mb-space-2">
        {titre}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-fs-200 font-semibold
      bg-gj-bg text-gj-ink border border-gj-line px-space-2 py-1 rounded-gj-pill">
      {children}
    </span>
  )
}

export function ObjectiveCard({
  objectif,
  secteurs,
  typesRecherches,
  regionsMobilite,
  onSaved,
}: ObjectiveCardProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Ce que l'écran montre : la dernière valeur ENREGISTRÉE, pas la saisie en
  // cours — sinon annuler laisserait l'affichage menteur.
  const [affiche, setAffiche] = useState({ objectif, secteurs, typesRecherches, regionsMobilite })
  const [form, setForm] = useState({
    objectif: objectif ?? '',
    secteurs: [...secteurs],
    typesRecherches: [...typesRecherches],
    regionsMobilite: [...regionsMobilite],
  })

  const bascule = (champ: 'secteurs' | 'typesRecherches' | 'regionsMobilite', valeur: string) =>
    setForm((f) => ({
      ...f,
      [champ]: f[champ].includes(valeur) ? f[champ].filter((v) => v !== valeur) : [...f[champ], valeur],
    }))

  async function enregistrer() {
    setSaving(true)
    setErreur(null)
    try {
      const corps = {
        // Un objectif vidé part à `null` : une chaîne vide en base se
        // relirait comme « renseigné mais muet ».
        objectif: form.objectif.trim() || null,
        // Le contrat d'API nomme ce champ `domainesInteret` ; la carte l'appelle
        // « secteurs visés », le mot que la maquette montre à l'utilisateur.
        domainesInteret: form.secteurs,
        typesRecherches: form.typesRecherches,
        regionsMobilite: form.regionsMobilite,
      }
      const res = await fetch('/api/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Enregistrement impossible')
      setAffiche({
        objectif: corps.objectif,
        secteurs: corps.domainesInteret,
        typesRecherches: corps.typesRecherches,
        regionsMobilite: corps.regionsMobilite,
      })
      onSaved?.(json.data)
      setEditing(false)
    } catch (e) {
      // On NE referme PAS le formulaire : la saisie serait perdue.
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const rien =
    !affiche.objectif?.trim() &&
    affiche.secteurs.length === 0 &&
    affiche.typesRecherches.length === 0 &&
    affiche.regionsMobilite.length === 0

  if (editing) {
    return (
      <section
        aria-label="Objectif & secteurs visés"
        className="bg-gj-surface border border-gj-line rounded-gj-lg p-space-4 flex flex-col gap-space-4"
      >
        <h2 className="text-fs-400 font-bold text-gj-ink m-0">Objectif &amp; secteurs visés</h2>

        {erreur && (
          <p role="alert" className="text-fs-200 text-gj-red-ink bg-gj-red-soft rounded-gj-md p-space-2 m-0">
            {erreur}
          </p>
        )}

        <div>
          <label htmlFor="objectif-champ" className="block text-fs-200 font-bold text-gj-ink mb-space-2">
            Mon objectif
          </label>
          <textarea
            id="objectif-champ"
            rows={3}
            maxLength={2000}
            value={form.objectif}
            onChange={(e) => setForm((f) => ({ ...f, objectif: e.target.value }))}
            placeholder="Ex. : lancer une micro-entreprise de maraîchage."
            className="w-full rounded-gj-md border border-gj-line p-space-2 text-fs-300 text-gj-ink"
          />
        </div>

        <fieldset className="border-0 p-0 m-0">
          <legend className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-grey mb-space-2">
            Secteurs visés
          </legend>
          <div className="flex flex-wrap gap-2">
            {DOMAINES_INTERET.map((d) => {
              const actif = form.secteurs.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => bascule('secteurs', d)}
                  className={`text-fs-200 font-semibold px-space-3 rounded-gj-pill border min-h-[var(--tap-min)]
                    ${actif ? 'bg-gj-teal text-white border-gj-teal' : 'bg-gj-surface text-gj-ink border-gj-line'}`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="border-0 p-0 m-0">
          <legend className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-grey mb-space-2">
            Type recherché
          </legend>
          <div className="flex flex-wrap gap-2">
            {TYPES_RECHERCHES.map((t) => {
              const actif = form.typesRecherches.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => bascule('typesRecherches', t)}
                  className={`text-fs-200 font-semibold px-space-3 rounded-gj-pill border min-h-[var(--tap-min)]
                    ${actif ? 'bg-gj-teal text-white border-gj-teal' : 'bg-gj-surface text-gj-ink border-gj-line'}`}
                >
                  {LIBELLE_TYPE[t] ?? t}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="border-0 p-0 m-0">
          <legend className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-grey mb-space-2">
            Mobilité
          </legend>
          <div className="flex flex-wrap gap-2">
            {Object.values(Region).map((r) => {
              const actif = form.regionsMobilite.includes(r)
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => bascule('regionsMobilite', r)}
                  className={`text-fs-200 font-semibold px-space-3 rounded-gj-pill border min-h-[var(--tap-min)]
                    ${actif ? 'bg-gj-teal text-white border-gj-teal' : 'bg-gj-surface text-gj-ink border-gj-line'}`}
                >
                  {regionLabel(r) ?? r}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="flex gap-space-2">
          <Button onClick={enregistrer} loading={saving}>Enregistrer</Button>
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Annuler</Button>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="Objectif & secteurs visés"
      className="bg-gj-surface border border-gj-line rounded-gj-lg p-space-4
        flex flex-col gap-space-4"
    >
      <div className="flex justify-between items-center gap-space-2">
        <h2 className="text-fs-400 font-bold text-gj-ink m-0">Objectif &amp; secteurs visés</h2>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
      </div>

      {rien ? (
        <p data-testid="objectif-vide" className="text-fs-200 text-gj-grey italic m-0">
          Dis ce que tu cherches : c&apos;est ce qui oriente les opportunités que
          Yaye te propose.
        </p>
      ) : (
        <>
          {affiche.objectif?.trim() && (
            <div className="flex gap-space-3 bg-gj-teal-soft rounded-gj-md p-space-3">
              <span
                aria-hidden
                className="w-[38px] h-[38px] rounded-gj-md shrink-0 bg-gj-surface text-gj-teal-deep
                  inline-flex items-center justify-center"
              >
                <Icon name="target" size={19} />
              </span>
              <div>
                <h3 className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-teal-deep m-0">
                  Mon objectif
                </h3>
                <p className="text-fs-300 font-bold text-gj-ink leading-snug mt-1 m-0">{affiche.objectif}</p>
              </div>
            </div>
          )}

          {affiche.secteurs.length > 0 && (
            <Bloc titre="Secteurs visés">
              {affiche.secteurs.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </Bloc>
          )}

          {affiche.typesRecherches.length > 0 && (
            <Bloc titre="Type recherché">
              {affiche.typesRecherches.map((t) => (
                <Chip key={t}>{LIBELLE_TYPE[t] ?? t}</Chip>
              ))}
            </Bloc>
          )}

          {affiche.regionsMobilite.length > 0 && (
            <Bloc titre="Mobilité">
              {affiche.regionsMobilite.map((r) => (
                <Chip key={r}>
                  <Icon name="pin" size={13} className="text-gj-teal-deep" aria-hidden />
                  {regionLabel(r) ?? r}
                </Chip>
              ))}
            </Bloc>
          )}
        </>
      )}
    </section>
  )
}
