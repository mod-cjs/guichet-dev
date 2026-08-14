'use client'

import { useMemo, useState } from 'react'
import { Switch } from '@/components/ui/Switch'
import { Tabs } from '@/components/ui/Tabs'
import type { FeatureFlagDef } from '@/lib/flags/types'

/**
 * GUIC-706 — Panneau de bascule des fonctionnalités.
 *
 * ORGANISATION — 36 entrées rendues d'un bloc produisent une page qu'on parcourt au
 * défilement plutôt qu'on ne consulte. L'administrateur y perd ce dont il a besoin au
 * moment d'ouvrir : voir d'un coup d'œil ce qui est masqué. D'où un résumé en tête, des
 * onglets par domaine, une recherche transverse, et des lignes denses sur deux colonnes.
 *
 * VOCABULAIRE — jamais « activé / désactivé », qui laisserait croire que l'administrateur
 * perd lui aussi l'accès. On dit « ouvert » / « masqué » aux utilisateurs, et le rappel
 * « vous conservez l'accès » est porté UNE fois en tête plutôt que répété 36 fois : la
 * répétition n'informe plus, elle allonge.
 */

interface Props {
  catalogue: readonly FeatureFlagDef[]
  initialFlags: Record<string, boolean>
  hits: Record<string, number>
  /** Faux pour un modérateur : lecture seule, sans quoi il se heurterait à un 403. */
  canManage: boolean
}

type Onglet = 'parcours' | 'espaces' | 'ia' | 'canaux' | 'donnees' | 'socle'

const ONGLETS: { value: Onglet; label: string }[] = [
  { value: 'parcours', label: 'Parcours jeune' },
  { value: 'espaces', label: 'Espaces pro' },
  { value: 'ia', label: 'Assistant IA' },
  { value: 'canaux', label: 'Canaux' },
  { value: 'donnees', label: 'Données & interop' },
  { value: 'socle', label: 'Socle' },
]

/**
 * Domaine d'un flag. Le verrouillage prime sur le module : le socle se lit d'un bloc,
 * et l'administrateur qui cherche à ouvrir quelque chose n'a jamais à le traverser.
 */
function ongletDe(f: FeatureFlagDef): Onglet {
  if (f.locked) return 'socle'
  if (['m3', 'm4', 'm5', 'm6'].includes(f.module)) return 'parcours'
  if (['m8', 'm9'].includes(f.module)) return 'espaces'
  if (f.module === 'm12') return 'ia'
  if (f.module === 'm11' || f.module === 'x') return 'canaux'
  return 'donnees'
}

const LIBELLE_AUDIENCE: Record<string, string> = {
  anonyme: 'visiteurs',
  beneficiaire: 'jeunes',
  recruteur: 'recruteurs',
  conseiller: 'conseillers',
}

export function FonctionnalitesForm({ catalogue, initialFlags, hits, canManage }: Props) {
  const [flags, setFlags] = useState(initialFlags)
  const [onglet, setOnglet] = useState<Onglet>('parcours')
  const [recherche, setRecherche] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const masquees = useMemo(
    () => catalogue.filter((f) => flags[f.key] === false).length,
    [catalogue, flags],
  )

  const compteurs = useMemo(() => {
    const n = {} as Record<Onglet, number>
    for (const o of ONGLETS) n[o.value] = 0
    for (const f of catalogue) n[ongletDe(f)] += 1
    return n
  }, [catalogue])

  // La recherche est transverse : sans elle, retrouver un flag suppose de deviner son
  // onglet. Quand elle est active, elle remplace le filtrage par onglet.
  const q = recherche.trim().toLowerCase()
  const visibles = useMemo(
    () =>
      catalogue.filter((f) =>
        q
          ? `${f.label} ${f.description} ${f.key}`.toLowerCase().includes(q)
          : ongletDe(f) === onglet,
      ),
    [catalogue, onglet, q],
  )

  /** Une dépendance masquée rend l'ouverture impossible : on l'annonce avant le clic. */
  const bloquePar = (f: FeatureFlagDef) => f.dependsOn.filter((d) => flags[d] === false)

  async function bascule(f: FeatureFlagDef, ouvert: boolean) {
    setErreur(null)
    setEnCours(f.key)
    // Optimiste : la bascule est instantanée à l'écran, et rétablie si le serveur refuse.
    const avant = flags
    setFlags({ ...flags, [f.key]: ouvert })
    try {
      const res = await fetch('/api/admin/systeme/flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: f.key, enabled: ouvert }),
      })
      const json = await res.json()
      if (!res.ok) {
        setFlags(avant)
        setErreur(json?.error?.message ?? 'Bascule refusée.')
        return
      }
      setFlags(json.data.flags)
    } catch {
      setFlags(avant)
      setErreur('Le serveur n’a pas répondu. Rien n’a été modifié.')
    } finally {
      setEnCours(null)
    }
  }

  return (
    <div className="flex flex-col gap-space-3">
      {/* Résumé — l'information cherchée en arrivant : y a-t-il quelque chose de fermé. */}
      <div className="flex items-center gap-space-4 flex-wrap rounded-gj-md border-[1.5px] border-color-border-default bg-color-surface-raised px-space-3 py-space-2">
        <Stat valeur={catalogue.length} libelle="fonctionnalités" />
        <Stat valeur={catalogue.length - masquees} libelle="ouvertes" />
        <Stat valeur={masquees} libelle="masquées" testId="resume-masquees" accent={masquees > 0} />
        <p className="text-fs-100 text-color-text-secondary m-0 flex-1 min-w-[220px]">
          Vous conservez l’accès complet à tout ce qui est masqué.
        </p>
      </div>

      {!canManage && (
        <div className="rounded-gj-md border-[1.5px] border-color-border-default bg-color-surface-raised p-space-2 text-fs-200 text-color-text-secondary">
          Consultation seule. Seule l’administration nationale peut ouvrir ou masquer une
          fonctionnalité.
        </div>
      )}
      {erreur && (
        <div
          role="alert"
          className="rounded-gj-md border-[1.5px] border-gj-red bg-color-surface-raised p-space-2 text-fs-200 text-color-text-primary"
        >
          {erreur}
        </div>
      )}

      <div className="flex items-center gap-space-3 flex-wrap">
        <Tabs
          value={onglet}
          onChange={setOnglet}
          ariaLabel="Domaines de fonctionnalités"
          items={ONGLETS.map((o) => ({ ...o, count: compteurs[o.value] }))}
        />
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une fonctionnalité…"
          aria-label="Rechercher une fonctionnalité"
          className="flex-1 min-w-[200px] h-11 rounded-gj-md border-[1.5px] border-color-border-default bg-color-surface-base px-space-3 text-fs-200 text-color-text-primary"
        />
      </div>

      {visibles.length === 0 ? (
        <p className="text-fs-200 text-color-text-secondary m-0 py-space-4 text-center">
          Aucune fonctionnalité ne correspond à « {recherche} ».
        </p>
      ) : (
        <ul
          data-testid="liste-fonctionnalites"
          className="grid grid-cols-1 lg:grid-cols-2 gap-space-2 list-none p-0 m-0"
        >
          {visibles.map((f) => {
            const ouvert = flags[f.key] !== false
            const bloquants = bloquePar(f)
            const inerte =
              !canManage || !!f.locked || enCours === f.key || (!ouvert && bloquants.length > 0)
            return (
              <li
                key={f.key}
                className="flex items-start gap-space-3 rounded-gj-md border-[1.5px] p-space-3"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: ouvert ? 'var(--color-border-default)' : 'var(--gj-yellow, #F4B930)',
                }}
              >
                <div className="flex-1 min-w-0 flex flex-col gap-space-1">
                  <div className="flex items-baseline gap-space-2 flex-wrap">
                    <span className="text-fs-300 font-bold text-color-text-primary">{f.label}</span>
                    {!ouvert && (
                      <span
                        className="text-fs-100 font-bold uppercase rounded-gj-sm px-space-1"
                        style={{ background: 'var(--gj-yellow, #F4B930)', color: '#1A1A1A' }}
                      >
                        Masqué
                      </span>
                    )}
                    {f.locked && (
                      <span className="text-fs-100 text-color-text-secondary">non masquable</span>
                    )}
                  </div>
                  <p className="text-fs-200 text-color-text-secondary m-0">{f.description}</p>
                  <p className="text-fs-100 text-color-text-secondary m-0">
                    {f.closes.length > 0
                      ? `Masque pour les ${f.closes.map((a) => LIBELLE_AUDIENCE[a] ?? a).join(', ')}.`
                      : 'Traitement interne, sans interface utilisateur.'}
                    {!ouvert && (hits[f.key] ?? 0) > 0 && (
                      // Un trafic sur un module masqué est le signal recherché : soit la
                      // demande existe, soit un lien subsiste quelque part.
                      <> {hits[f.key]} tentative{hits[f.key] > 1 ? 's' : ''} d’accès depuis.</>
                    )}
                    {!ouvert && bloquants.length > 0 && (
                      <> Ouverture bloquée par {bloquants.join(', ')}.</>
                    )}
                  </p>
                </div>
                <Switch
                  checked={ouvert}
                  disabled={inerte}
                  onChange={(next) => bascule(f, next)}
                  aria-label={`${f.label} — ${ouvert ? 'ouvert' : 'masqué'} aux utilisateurs`}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Stat({
  valeur,
  libelle,
  testId,
  accent = false,
}: {
  valeur: number
  libelle: string
  testId?: string
  accent?: boolean
}) {
  return (
    <p data-testid={testId} className="flex items-baseline gap-space-1 m-0">
      <span
        className="text-fs-500 font-bold"
        style={{ color: accent ? 'var(--gj-yellow, #F4B930)' : 'var(--color-text-primary)' }}
      >
        {valeur}
      </span>
      <span className="text-fs-200 text-color-text-secondary">{libelle}</span>
    </p>
  )
}
