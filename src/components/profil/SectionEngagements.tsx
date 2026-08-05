'use client'

import { useState } from 'react'
import { Button, Icon, Input } from '@/components/ui'
import type { EngagementItem } from '@/types/profil'

export interface SectionEngagementsProps {
  engagements: EngagementItem[]
}

/**
 * <SectionEngagements /> — saisie des engagements associatifs / bénévolat.
 *
 * `Engagement` est le type créé pour la timeline unifiée (GUIC-689) : avant lui,
 * le bénévolat était soit absent, soit saisi comme une expérience
 * professionnelle — ce qui fausse la lecture d'un parcours et, au passage, le
 * matching, qui ne distingue plus un emploi d'un volontariat.
 */
const ANNEE = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

function periode(debut: string, fin: string | null): string {
  const d = ANNEE.format(new Date(debut))
  return fin ? `${d} — ${ANNEE.format(new Date(fin))}` : `${d} — en cours`
}

const VIDE = { role: '', organisation: '', dateDebut: '', dateFin: '' }

export function SectionEngagements({ engagements }: SectionEngagementsProps) {
  const [liste, setListe] = useState(engagements)
  const [ouvert, setOuvert] = useState(false)
  const [form, setForm] = useState(VIDE)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const set = (champ: keyof typeof VIDE, v: string) => setForm((f) => ({ ...f, [champ]: v }))

  async function enregistrer() {
    // Validation côté client AVANT l'appel : un aller-retour pour apprendre
    // qu'un champ obligatoire est vide est du temps perdu sur réseau lent.
    if (!form.role.trim() || !form.organisation.trim() || !form.dateDebut) {
      setErreur('Renseigne le rôle, l’organisation et la date de début.')
      return
    }
    setOccupe(true)
    setErreur(null)
    try {
      const res = await fetch('/api/profil/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role.trim(),
          organisation: form.organisation.trim(),
          dateDebut: form.dateDebut,
          // Fin non renseignée = engagement EN COURS, pas donnée manquante.
          dateFin: form.dateFin || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Enregistrement impossible')
      setListe((l) => [json.data, ...l])
      setForm(VIDE)
      setOuvert(false)
    } catch (e) {
      // Formulaire gardé ouvert : le refermer perdrait la saisie.
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setOccupe(false)
    }
  }

  async function supprimer(e: EngagementItem) {
    setOccupe(true)
    setErreur(null)
    try {
      const res = await fetch(`/api/profil/engagements/${e.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error?.message ?? 'Suppression impossible')
      }
      setListe((l) => l.filter((x) => x.id !== e.id))
    } catch (err) {
      // La ligne reste : la retirer alors que le serveur l'a gardée ferait
      // croire à une suppression qui n'a pas eu lieu.
      setErreur(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section
      aria-label="Engagements"
      className="bg-gj-surface border border-gj-line rounded-gj-lg p-space-4 flex flex-col gap-space-3"
    >
      <div className="flex justify-between items-center gap-space-2">
        <h2 className="text-fs-400 font-bold text-gj-ink m-0">Engagements</h2>
        {!ouvert && (
          <Button variant="ghost" size="sm" onClick={() => setOuvert(true)}>+ Ajouter</Button>
        )}
      </div>

      {erreur && (
        <p role="alert" className="text-fs-200 text-gj-red-ink bg-gj-red-soft rounded-gj-md p-space-2 m-0">
          {erreur}
        </p>
      )}

      {ouvert && (
        <div className="flex flex-col gap-space-3 border border-gj-line rounded-gj-md p-space-3">
          <Input
            label="Rôle"
            value={form.role}
            maxLength={150}
            onChange={(e) => set('role', e.target.value)}
            placeholder="Ex. : bénévole sensibilisation"
          />
          <Input
            label="Organisation"
            value={form.organisation}
            maxLength={150}
            onChange={(e) => set('organisation', e.target.value)}
            placeholder="Ex. : Jeunesse & Environnement"
          />
          <div className="grid grid-cols-2 gap-space-3">
            <Input
              label="Début"
              type="date"
              value={form.dateDebut}
              onChange={(e) => set('dateDebut', e.target.value)}
            />
            <Input
              label="Fin (laisser vide si en cours)"
              type="date"
              value={form.dateFin}
              onChange={(e) => set('dateFin', e.target.value)}
            />
          </div>
          <div className="flex gap-space-2">
            <Button onClick={enregistrer} loading={occupe}>Enregistrer</Button>
            <Button
              variant="ghost"
              onClick={() => { setOuvert(false); setForm(VIDE); setErreur(null) }}
              disabled={occupe}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {liste.length === 0 ? (
        <p data-testid="engagements-vide" className="text-fs-200 text-gj-grey italic m-0">
          Bénévolat, volontariat, vie associative : ça compte dans un parcours, et
          les recruteurs le lisent.
        </p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-space-3">
          {liste.map((e) => (
            <li key={e.id} className="flex items-start gap-space-3">
              <span className="flex-1 min-w-0">
                <span className="block text-fs-300 font-extrabold text-gj-ink">{e.role}</span>
                <span className="block text-fs-200 text-gj-grey">{e.organisation}</span>
                <span className="block text-fs-100 text-gj-grey-2 mt-[2px]">
                  {periode(e.dateDebut, e.dateFin)}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Supprimer ${e.role}`}
                onClick={() => supprimer(e)}
                disabled={occupe}
                className="inline-flex items-center justify-center w-8 h-8 rounded-gj-md
                  text-gj-grey hover:text-gj-red-ink shrink-0"
              >
                <Icon name="close" size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
