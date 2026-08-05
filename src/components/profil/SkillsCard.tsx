'use client'

import { useState } from 'react'
import { Button, Icon } from '@/components/ui'
import { NIVEAUX_LANGUE } from '@/lib/profil-schemas'
import type { LangueItem } from '@/types/profil'

export interface SkillsCardProps {
  competences: string[]
  langues: LangueItem[]
  /** Ouvre l'ajout et le retrait des langues. Sans lui, la carte est consultable. */
  editable?: boolean
}

/**
 * <SkillsCard /> — « Compétences & langues ».
 *
 * Réf `design-guichet-v5/profil-web.jsx` (`SkillsCard` L.546-565). Les langues
 * n'existaient pas en base : le modèle `LangueProfil` a été créé pour cette
 * carte, avec un niveau en enum plutôt qu'un texte libre — au Sénégal le
 * plurilinguisme compte dans le matching (wolof, français, pulaar, sérère), et
 * un texte libre ne s'exploiterait pas.
 *
 * La barre de niveau est DÉCORATIVE : le niveau reste écrit en toutes lettres.
 * Une barre seule ne dit rien à un lecteur d'écran, et rien du tout à qui ne
 * distingue pas les longueurs.
 */
const NIVEAUX: Record<LangueItem['niveau'], { label: string; part: number }> = {
  maternelle:    { label: 'Langue maternelle', part: 100 },
  courant:       { label: 'Courant',           part: 80 },
  intermediaire: { label: 'Intermédiaire',     part: 55 },
  notions:       { label: 'Notions',           part: 30 },
}

export function SkillsCard({ competences, langues, editable }: SkillsCardProps) {
  // Ajout et retrait sont des appels DISTINCTS (POST / DELETE) : une liste
  // éditée en bloc obligerait à renvoyer l'ensemble à chaque changement, et
  // écraserait ce qu'un autre onglet vient d'ajouter.
  const [liste, setListe] = useState(langues)
  const [nom, setNom] = useState('')
  const [niveau, setNiveau] = useState<LangueItem['niveau']>('courant')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function ajouter() {
    const langue = nom.trim()
    if (!langue) return
    setOccupe(true)
    setErreur(null)
    try {
      const res = await fetch('/api/profil/langues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ langue, niveau }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Ajout impossible')
      setListe((l) => [...l, json.data])
      setNom('')
    } catch (e) {
      // On NE vide PAS la saisie : sur doublon, l'utilisateur veut corriger le
      // nom, pas le retaper.
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setOccupe(false)
    }
  }

  async function retirer(l: LangueItem) {
    setOccupe(true)
    setErreur(null)
    try {
      const res = await fetch(`/api/profil/langues/${l.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error?.message ?? 'Suppression impossible')
      }
      setListe((prev) => prev.filter((x) => x.id !== l.id))
    } catch (e) {
      // La ligne RESTE affichée : la faire disparaître alors que le serveur l'a
      // gardée ferait croire à une suppression qui n'a pas eu lieu.
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setOccupe(false)
    }
  }

  const rien = competences.length === 0 && liste.length === 0 && !editable

  return (
    <section
      aria-label="Compétences & langues"
      className="bg-gj-surface border border-gj-line rounded-gj-lg p-space-4
        flex flex-col gap-space-4"
    >
      <h2 className="text-fs-400 font-bold text-gj-ink m-0">Compétences &amp; langues</h2>

      {rien ? (
        <p data-testid="competences-vide" className="text-fs-200 text-gj-grey italic m-0">
          Ajoute tes compétences et les langues que tu parles : les recruteurs les
          cherchent en premier.
        </p>
      ) : (
        <>
          {competences.length > 0 && (
            <div>
              <h3 className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-grey m-0 mb-space-2">
                Compétences
              </h3>
              <div className="flex flex-wrap gap-2">
                {competences.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center text-fs-200 font-semibold
                      bg-gj-bg text-gj-ink border border-gj-line px-space-2 py-1 rounded-gj-pill"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(liste.length > 0 || editable) && (
            <div>
              <h3 className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-grey m-0 mb-space-3">
                Langues
              </h3>
              <ul data-testid="langues-liste" className="list-none p-0 m-0 flex flex-col gap-space-3">
                {liste.map((l) => {
                  const n = NIVEAUX[l.niveau]
                  return (
                    <li key={l.id}>
                      <span className="flex items-baseline justify-between gap-space-2">
                        <span className="text-fs-200 font-extrabold text-gj-ink">{l.langue}</span>
                        <span className="flex items-center gap-space-2">
                          <span className="text-fs-100 text-gj-grey">{n.label}</span>
                          {editable && (
                            <button
                              type="button"
                              aria-label={`Retirer ${l.langue}`}
                              onClick={() => retirer(l)}
                              disabled={occupe}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-gj-md
                                text-gj-grey hover:text-gj-red-ink"
                            >
                              <Icon name="close" size={14} aria-hidden />
                            </button>
                          )}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        role="progressbar"
                        className="block mt-1 h-[6px] bg-gj-bg rounded-gj-pill overflow-hidden"
                      >
                        <span
                          className="block h-full bg-gj-teal rounded-gj-pill"
                          style={{ width: `${n.part}%` }}
                        />
                      </span>
                    </li>
                  )
                })}
              </ul>

              {editable && (
                <div className="mt-space-3 flex flex-wrap items-end gap-space-2">
                  <span className="flex-1 min-w-[140px]">
                    <label htmlFor="langue-nom" className="block text-fs-100 font-bold text-gj-grey mb-1">
                      Langue
                    </label>
                    <input
                      id="langue-nom"
                      value={nom}
                      maxLength={60}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Ex. : Pulaar"
                      className="w-full rounded-gj-md border border-gj-line px-space-2 text-fs-200
                        min-h-[var(--tap-min)] text-gj-ink"
                    />
                  </span>
                  <span>
                    <label htmlFor="langue-niveau" className="block text-fs-100 font-bold text-gj-grey mb-1">
                      Niveau
                    </label>
                    <select
                      id="langue-niveau"
                      value={niveau}
                      onChange={(e) => setNiveau(e.target.value as LangueItem['niveau'])}
                      className="rounded-gj-md border border-gj-line px-space-2 text-fs-200
                        min-h-[var(--tap-min)] text-gj-ink bg-gj-surface"
                    >
                      {NIVEAUX_LANGUE.map((n) => (
                        <option key={n} value={n}>{NIVEAUX[n].label}</option>
                      ))}
                    </select>
                  </span>
                  <Button size="sm" onClick={ajouter} loading={occupe}>Ajouter</Button>
                </div>
              )}

              {erreur && (
                <p role="alert" className="text-fs-200 text-gj-red-ink bg-gj-red-soft rounded-gj-md p-space-2 mt-space-2 m-0">
                  {erreur}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
