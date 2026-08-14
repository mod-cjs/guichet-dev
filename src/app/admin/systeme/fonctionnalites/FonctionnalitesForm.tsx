'use client'

import { useMemo, useState } from 'react'
import { Switch } from '@/components/ui/Switch'
import type { FeatureFlagDef } from '@/lib/flags/types'

/**
 * GUIC-706 — Panneau de bascule des fonctionnalités.
 *
 * VOCABULAIRE — jamais « activé / désactivé », qui laisserait croire que l'administrateur
 * perd lui aussi l'accès. On dit « ouvert aux utilisateurs » / « masqué aux utilisateurs » :
 * c'est exactement ce que fait le flag, et c'est ce qui rend le dispositif compréhensible.
 */

interface Props {
  catalogue: readonly FeatureFlagDef[]
  initialFlags: Record<string, boolean>
  hits: Record<string, number>
  /** Faux pour un modérateur : lecture seule, sans quoi il se heurterait à un 403. */
  canManage: boolean
}

const LIBELLE_MODULE: Record<string, string> = {
  m1: 'Socle', m2: 'Comptes & profil', m3: 'Opportunités', m4: 'Centres & services',
  m5: 'Agenda', m6: 'Ressources', m7: 'Référencement', m8: 'Administration',
  m9: 'Recruteur', m10: 'Interopérabilité', m11: 'WhatsApp', m12: 'Assistant IA',
  m13: 'Data Hub', m14: 'Exploitation', x: 'Transverse',
}

const LIBELLE_AUDIENCE: Record<string, string> = {
  anonyme: 'Visiteurs', beneficiaire: 'Jeunes', recruteur: 'Recruteurs', conseiller: 'Conseillers',
}

export function FonctionnalitesForm({ catalogue, initialFlags, hits, canManage }: Props) {
  const [flags, setFlags] = useState(initialFlags)
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const parModule = useMemo(() => {
    const groupes = new Map<string, FeatureFlagDef[]>()
    for (const f of catalogue) {
      const liste = groupes.get(f.module) ?? []
      liste.push(f)
      groupes.set(f.module, liste)
    }
    return [...groupes.entries()]
  }, [catalogue])

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
    <div className="flex flex-col gap-space-4">
      {!canManage && (
        <div className="rounded-gj-md border-[1.5px] border-color-border-default bg-color-surface-raised p-space-3 text-fs-200 text-color-text-secondary">
          Consultation seule. Seule l’administration nationale peut ouvrir ou masquer une
          fonctionnalité.
        </div>
      )}
      {erreur && (
        <div
          role="alert"
          className="rounded-gj-md border-[1.5px] border-gj-red bg-color-surface-raised p-space-3 text-fs-200 text-color-text-primary"
        >
          {erreur}
        </div>
      )}

      {parModule.map(([module, liste]) => (
        <section key={module} className="flex flex-col gap-space-2">
          <h2 className="text-fs-400 font-bold text-color-text-primary">
            {LIBELLE_MODULE[module] ?? module}
          </h2>
          <ul className="flex flex-col gap-space-2 list-none p-0 m-0">
            {liste.map((f) => {
              const ouvert = flags[f.key] !== false
              const bloquants = bloquePar(f)
              const inerte = !canManage || !!f.locked || enCours === f.key || (!ouvert && bloquants.length > 0)
              return (
                <li
                  key={f.key}
                  className="flex items-start gap-space-3 rounded-gj-md border-[1.5px] border-color-border-default bg-color-surface-raised p-space-3"
                >
                  <div className="flex-1 flex flex-col gap-space-1">
                    <div className="flex items-center gap-space-2 flex-wrap">
                      <span className="text-fs-300 font-bold text-color-text-primary">{f.label}</span>
                      <span
                        className="text-fs-100 font-bold uppercase rounded-gj-sm px-space-1"
                        style={{
                          background: ouvert ? 'var(--gj-teal-soft, #E6F4F1)' : 'var(--gj-line, #E5E7EB)',
                          color: ouvert ? 'var(--gj-teal-deep, #0B5C51)' : 'var(--gj-grey, #6B7280)',
                        }}
                      >
                        {ouvert ? 'Ouvert aux utilisateurs' : 'Masqué aux utilisateurs'}
                      </span>
                      {f.locked && (
                        <span className="text-fs-100 text-color-text-secondary">
                          · socle, non masquable
                        </span>
                      )}
                    </div>
                    <p className="text-fs-200 text-color-text-secondary m-0">{f.description}</p>
                    <p className="text-fs-100 text-color-text-secondary m-0">
                      {f.closes.length > 0
                        ? `Masque pour : ${f.closes.map((a) => LIBELLE_AUDIENCE[a] ?? a).join(', ')}.`
                        : 'Aucune interface utilisateur — traitement interne.'}
                      {' '}Vous conservez l’accès à l’administration.
                    </p>
                    {!ouvert && (hits[f.key] ?? 0) > 0 && (
                      // Un trafic sur un module masqué est le signal recherché : soit la
                      // demande existe, soit un lien subsiste quelque part.
                      <p className="text-fs-100 text-color-text-secondary m-0">
                        {hits[f.key]} tentative{hits[f.key] > 1 ? 's' : ''} d’accès depuis le masquage.
                      </p>
                    )}
                    {!ouvert && bloquants.length > 0 && (
                      <p className="text-fs-100 text-color-text-secondary m-0">
                        Ouverture impossible tant que {bloquants.join(', ')} reste masqué.
                      </p>
                    )}
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
        </section>
      ))}
    </div>
  )
}
