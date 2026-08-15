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

/** Une étape de séquence, telle que l'annonce le serveur. */
interface Etape {
  key: string
  label: string
  engagements: number
  engagementsLabel: string | null
}

interface Props {
  catalogue: readonly FeatureFlagDef[]
  initialFlags: Record<string, boolean>
  hits: Record<string, number>
  /** Faux pour un modérateur : lecture seule, sans quoi il se heurterait à un 403. */
  canManage: boolean
}

type Onglet = 'parcours' | 'conseillers' | 'recruteurs' | 'ia' | 'canaux' | 'donnees' | 'socle'

const ONGLETS: { value: Onglet; label: string }[] = [
  { value: 'parcours', label: 'Parcours jeune' },
  { value: 'conseillers', label: 'Conseillers' },
  { value: 'recruteurs', label: 'Recruteurs' },
  { value: 'ia', label: 'Assistant IA' },
  { value: 'canaux', label: 'Canaux' },
  { value: 'donnees', label: 'Données & interop' },
  { value: 'socle', label: 'Socle' },
]

/**
 * Domaine d'un flag.
 *
 * Le verrouillage prime sur le module : le socle se lit d'un bloc, et l'administrateur
 * qui cherche à ouvrir quelque chose n'a jamais à le traverser.
 *
 * Conseillers et recruteurs ont chacun leur onglet : ils n'ont ni les mêmes outils ni les
 * mêmes rythmes d'ouverture — le personnel des centres travaille dès la préparation, les
 * partenaires arrivent avec le catalogue — et les mêler obligeait à trier de l'œil deux
 * métiers sans rapport à chaque consultation.
 */
function ongletDe(f: FeatureFlagDef): Onglet {
  if (f.locked) return 'socle'
  if (['m3', 'm4', 'm5', 'm6'].includes(f.module)) return 'parcours'
  if (f.module === 'm8') return 'conseillers'
  if (f.module === 'm9') return 'recruteurs'
  if (f.module === 'm12') return 'ia'
  if (f.module === 'm11' || f.module === 'x') return 'canaux'
  return 'donnees'
}

/** Publics, nommés en clair et colorés par espace — les couleurs d'identité de rôle v3. */
const AUDIENCE: Record<string, { label: string; fond: string; encre: string }> = {
  anonyme: { label: 'Visiteurs', fond: 'var(--gj-line, #E5E7EB)', encre: '#374151' },
  beneficiaire: { label: 'Jeunes', fond: 'var(--gj-teal-soft, #D7F0EA)', encre: '#0B5C51' },
  recruteur: { label: 'Recruteurs', fond: 'var(--gj-blue-soft, #E0EAFF)', encre: '#1A3FA8' },
  conseiller: { label: 'Conseillers', fond: 'var(--gj-yellow-soft, #FDF0CE)', encre: '#7A5A00' },
}

/**
 * Publics qui perdent la fonctionnalité.
 *
 * En pastilles plutôt qu'en phrase : « qui perd quoi » est le cœur de la décision
 * d'ouverture, et sur une dizaine de lignes comparées côte à côte on balaie, on ne lit pas.
 */
function PastillesAudience({ closes }: { closes: readonly string[] }) {
  if (closes.length === 0) {
    // Une ligne sans pastille serait ambiguë : oubli d'affichage ou absence de public ?
    return (
      <span className="text-fs-100 text-color-text-secondary">Traitement interne</span>
    )
  }
  return (
    <>
      {closes.map((a) => {
        const { label, fond, encre } = AUDIENCE[a] ?? { label: a, fond: 'var(--gj-line)', encre: '#374151' }
        return (
          <span
            key={a}
            data-testid="pastille-audience"
            className="text-fs-100 font-bold rounded-gj-sm px-space-1 whitespace-nowrap"
            style={{ background: fond, color: encre }}
          >
            {label}
          </span>
        )
      })}
    </>
  )
}

export function FonctionnalitesForm({ catalogue, initialFlags, hits, canManage }: Props) {
  const [flags, setFlags] = useState(initialFlags)
  const [onglet, setOnglet] = useState<Onglet>('parcours')
  const [recherche, setRecherche] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  // Séquence annoncée par le serveur, en attente de confirmation.
  const [aConfirmer, setAConfirmer] = useState<
    { flag: FeatureFlagDef; ouvrir: boolean; sequence: Etape[]; checklist: string[] } | null
  >(null)

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

  /**
   * Demande la séquence au serveur. Si elle dépasse la seule fonctionnalité visée, on
   * confirme d'abord : basculer six choses quand l'administrateur en a cliqué une doit
   * être annoncé, jamais subi.
   */
  async function demander(f: FeatureFlagDef, ouvrir: boolean) {
    setErreur(null)
    try {
      const res = await fetch(
        `/api/admin/systeme/flags?cascade=${encodeURIComponent(f.key)}&enabled=${ouvrir}`,
      )
      const json = await res.json()
      const sequence: Etape[] = json?.data?.sequence ?? []
      const checklist: string[] = json?.data?.checklist?.avertissements ?? []
      // On confirme dès qu'il y a quelque chose à dire : une séquence de groupe, ou une
      // ouverture sur un module froid. Une bascule simple et sans risque reste directe.
      if (sequence.length > 1 || checklist.length > 0) {
        setAConfirmer({ flag: f, ouvrir, sequence, checklist })
        return
      }
    } catch {
      // Séquence indisponible : on tente la bascule simple, le serveur tranchera.
    }
    await bascule(f, ouvrir, false)
  }

  async function bascule(f: FeatureFlagDef, ouvert: boolean, enCascade: boolean) {
    setErreur(null)
    setAConfirmer(null)
    setEnCours(f.key)
    // Optimiste : la bascule est instantanée à l'écran, et rétablie si le serveur refuse.
    const avant = flags
    setFlags({ ...flags, [f.key]: ouvert })
    try {
      const res = await fetch('/api/admin/systeme/flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: f.key, enabled: ouvert, cascade: enCascade }),
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

      {aConfirmer && (
        <div
          role="alertdialog"
          aria-label="Confirmer la bascule groupée"
          className="rounded-gj-md border-[1.5px] p-space-3 flex flex-col gap-space-2"
          style={{ borderColor: 'var(--gj-yellow, #F4B930)', background: 'var(--color-surface-raised)' }}
        >
          <p className="text-fs-300 font-bold text-color-text-primary m-0">
            {aConfirmer.ouvrir ? 'Ouvrir' : 'Masquer'} « {aConfirmer.flag.label} »
            {aConfirmer.sequence.length > 1 && <> entraîne {aConfirmer.sequence.length} bascules</>}
          </p>
          <ol className="text-fs-200 text-color-text-secondary m-0 pl-space-4">
            {aConfirmer.sequence.map((e) => (
              <li key={e.key}>
                {e.label}
                {e.engagements > 0 && (
                  // Ce que la bascule laisse derrière elle : les titulaires gardent
                  // l'accès à ce qui les concerne, personne d'autre ne voit rien.
                  <span className="text-color-text-secondary">
                    {' '}— {e.engagements} {e.engagementsLabel ?? 'engagements'} en cours,
                    conservés pour leurs titulaires
                  </span>
                )}
              </li>
            ))}
          </ol>
          {aConfirmer.checklist.length > 0 && (
            <ul className="text-fs-200 m-0 pl-space-4" style={{ color: 'var(--gj-yellow-ink, #7A5A00)' }}>
              {aConfirmer.checklist.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          <p className="text-fs-100 text-color-text-secondary m-0">
            {aConfirmer.sequence.length > 1
              ? 'L’ordre est imposé par les dépendances. Tout est appliqué d’un bloc, ou rien.'
              : 'Vous pouvez ouvrir malgré ces avertissements.'}
          </p>
          <div className="flex gap-space-2">
            <button
              type="button"
              onClick={() => bascule(aConfirmer.flag, aConfirmer.ouvrir, true)}
              className="h-11 px-space-4 rounded-gj-md text-fs-200 font-bold"
              style={{ background: 'var(--gj-teal-deep, #0B5C51)', color: '#fff' }}
            >
              {aConfirmer.sequence.length > 1
                ? `Appliquer les ${aConfirmer.sequence.length} bascules`
                : aConfirmer.ouvrir
                  ? 'Ouvrir quand même'
                  : 'Masquer'}
            </button>
            <button
              type="button"
              onClick={() => setAConfirmer(null)}
              className="h-11 px-space-4 rounded-gj-md text-fs-200 font-bold border-[1.5px] border-color-border-default"
            >
              Annuler
            </button>
          </div>
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
                  <div className="flex items-center gap-space-1 flex-wrap">
                    <span className="text-fs-100 text-color-text-secondary">Masque pour</span>
                    <PastillesAudience closes={f.closes} />
                  </div>
                  {(!ouvert && ((hits[f.key] ?? 0) > 0 || bloquants.length > 0)) && (
                    <p className="text-fs-100 text-color-text-secondary m-0">
                      {(hits[f.key] ?? 0) > 0 && (
                        // Un trafic sur un module masqué est le signal recherché : soit la
                        // demande existe, soit un lien subsiste quelque part.
                        <>{hits[f.key]} tentative{hits[f.key] > 1 ? 's' : ''} d’accès depuis. </>
                      )}
                      {bloquants.length > 0 && <>Ouverture bloquée par {bloquants.join(', ')}.</>}
                    </p>
                  )}
                </div>
                <Switch
                  checked={ouvert}
                  disabled={inerte}
                  onChange={(next) => demander(f, next)}
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
