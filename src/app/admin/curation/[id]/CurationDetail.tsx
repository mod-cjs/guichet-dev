'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { approuverItem, rejeterItem, mettreEnAttenteItem, editerItem } from '../actions'
import { publierItem } from '../publier'
import { ProgrammesField, type ProgrammeOption } from '@/components/admin/ProgrammesField'
import { DOMAINES_VISIBLES, domaineProposePourCuration, libelleDomaine } from '@/lib/domaines'

/** GUIC-600 — US-5 : détail éditable + actions de validation. */

interface Champs {
  titre: string
  description: string
  organisation: string
  region: string
  domaine: string
  typeId: string
  deadline: string
  lienSource: string
}

interface CurationDetailProps {
  id: string
  statut: string
  opportuniteId?: string | null
  score: number
  sourceNom: string
  urlSource: string
  motifRejet: string | null
  champs: Champs
  types: Array<{ id: string; libelle: string }>
  /** GUIC-684 — programmes actifs proposés au rattachement à la publication. */
  programmes?: ProgrammeOption[]
}

export function CurationDetail({
  id,
  statut,
  opportuniteId,
  score,
  sourceNom,
  urlSource,
  champs: initial,
  types,
  programmes = [],
}: CurationDetailProps) {
  const router = useRouter()
  const [c, setC] = useState<Champs>(initial)
  const [motif, setMotif] = useState('')
  // GUIC-684 — rattachement choisi à la publication (aucun défaut : c'est un acte métier).
  const [programmeSlugs, setProgrammeSlugs] = useState<string[]>([])
  const [programmePrincipal, setProgrammePrincipal] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const modifiable = statut === 'a_valider' || statut === 'en_attente'
  const sale = JSON.stringify(c) !== JSON.stringify(initial)
  const lienSur = /^https:\/\/|^http:\/\//i.test(urlSource)

  function set<K extends keyof Champs>(cle: K, val: string) {
    setC((prev) => ({ ...prev, [cle]: val }))
  }

  function champsPayload() {
    return {
      titre: c.titre || undefined,
      description: c.description || undefined,
      organisation: c.organisation || undefined,
      region: c.region || undefined,
      domaine: c.domaine || undefined,
      typeId: c.typeId || undefined,
      deadline: c.deadline || undefined,
      lienSource: c.lienSource || undefined,
    }
  }

  function agir(fn: () => Promise<void>, redirige = true) {
    setErreur(null)
    start(async () => {
      try {
        await fn()
        if (redirige) router.push('/admin/curation')
        else router.refresh()
      } catch (e) {
        setErreur(e instanceof Error ? e.message : 'Échec de l’action.')
      }
    })
  }

  /** Action de validation : PERSISTE d'abord les corrections en cours (si le formulaire
   *  est modifié) pour ne jamais les perdre, PUIS applique la transition. */
  function valider(action: () => Promise<void>) {
    agir(async () => {
      if (sale) await editerItem(id, champsPayload())
      await action()
    })
  }

  const typeOptions = [
    { value: '', label: '— Non défini —' },
    ...types.map((t) => ({ value: t.id, label: t.libelle })),
  ]

  return (
    <div style={{ padding: '22px 28px 40px', overflowY: 'auto', flex: 1 }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <a
          href="/admin/curation"
          style={{ fontSize: 13, color: 'var(--gj-grey)', textDecoration: 'none' }}
        >
          ← Retour à la file
        </a>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--gj-ink)', margin: '8px 0 4px' }}>
          Valider l’opportunité
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 0 }}>
          Source : <strong>{sourceNom}</strong> · complétude {score}% · statut {statut}
          {lienSur && (
            <>
              {' · '}
              <a href={urlSource} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gj-teal-deep)' }}>
                voir l’annonce d’origine
              </a>
            </>
          )}
        </p>
        {!modifiable && (
          <p
            role="status"
            className="text-fs-200 font-bold"
            style={{ color: 'var(--gj-grey)', marginTop: 8 }}
          >
            Cet item est «&nbsp;{statut}&nbsp;» : consultation seule.
          </p>
        )}

        {/* Publication (GUIC-601) : uniquement sur un item approuvé pas encore publié. */}
        {statut === 'approuvee' && !opportuniteId && (
          <div style={{ marginTop: 12 }} className="flex flex-col gap-space-2">
            {/* GUIC-684 — le rattachement se décide ICI : c'est le seul moment où un
                humain voit passer l'item de curation. */}
            <ProgrammesField
              options={programmes}
              value={programmeSlugs}
              onChange={setProgrammeSlugs}
              principal={programmePrincipal}
              onPrincipalChange={setProgrammePrincipal}
            />
            <div>
              <Button
                type="button"
                variant="primary"
                disabled={pending || programmeSlugs.length === 0}
                onClick={() =>
                  agir(async () => {
                    const { opportuniteId: oppId } = await publierItem(id, programmeSlugs)
                    router.push(`/admin/opportunites/${oppId}`)
                  }, false)
                }
              >
                Publier vers le catalogue
              </Button>
            </div>
            <p className="text-fs-200 text-gj-grey">
              Crée un brouillon d’opportunité ; tu complètes les détails puis publies dans l’éditeur.
            </p>
          </div>
        )}
        {statut === 'approuvee' && opportuniteId && (
          <p className="text-fs-200 font-bold" style={{ marginTop: 12 }}>
            Déjà publiée —{' '}
            <a href={`/admin/opportunites/${opportuniteId}`} style={{ color: 'var(--gj-teal-deep)' }}>
              ouvrir l’opportunité
            </a>
          </p>
        )}

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-space-3"
          style={{ marginTop: 16 }}
        >
          <Input id="c-titre" label="Titre" value={c.titre} onChange={(e) => set('titre', e.target.value)} />
          <Textarea id="c-desc" label="Description" rows={5} value={c.description} onChange={(e) => set('description', e.target.value)} />
          <Input id="c-org" label="Organisation" value={c.organisation} onChange={(e) => set('organisation', e.target.value)} />
          <Input id="c-region" label="Région" value={c.region} onChange={(e) => set('region', e.target.value)} />
          {/* GUIC-689 — CHOIX explicite, plus un champ libre : `domaineOuAutre()`
              n'acceptait que la correspondance exacte avec un nom d'enum, tout le
              reste retombant silencieusement sur `Autre`. La proposition vient du
              normaliseur par mots-clés ; l'admin confirme ou corrige. */}
          <Select
            id="c-domaine"
            label="Domaine"
            options={[
              { value: '', label: '— à choisir —' },
              ...DOMAINES_VISIBLES.map((d) => ({ value: d, label: libelleDomaine(d) })),
            ]}
            value={c.domaine}
            onChange={(e) => set('domaine', e.target.value)}
          />
          <Select id="c-type" label="Type d’opportunité" options={typeOptions} value={c.typeId} onChange={(e) => set('typeId', e.target.value)} />
          <Input id="c-deadline" label="Deadline (AAAA-MM-JJ)" value={c.deadline} onChange={(e) => set('deadline', e.target.value)} />
          <Input id="c-lien" label="Lien source" type="url" value={c.lienSource} onChange={(e) => set('lienSource', e.target.value)} />

          <Button
            type="button"
            variant="secondary"
            disabled={pending || !modifiable || !sale}
            onClick={() => agir(() => editerItem(id, champsPayload()), false)}
          >
            Enregistrer les corrections
          </Button>
        </form>

        {/* Rejet : motif obligatoire */}
        <div style={{ marginTop: 20, borderTop: '1px solid var(--gj-border)', paddingTop: 16 }}>
          <Textarea
            id="c-motif"
            label="Motif de rejet (requis pour rejeter)"
            rows={2}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
        </div>

        {erreur && (
          <p role="alert" className="text-fs-200 text-gj-red font-bold" style={{ marginTop: 10 }}>
            {erreur}
          </p>
        )}

        {modifiable && (
          <div className="flex items-center gap-space-2" style={{ marginTop: 16, flexWrap: 'wrap' }}>
            <Button type="button" variant="primary" disabled={pending} onClick={() => valider(() => approuverItem(id))}>
              Approuver{sale ? ' (enregistre d’abord)' : ''}
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={() => valider(() => rejeterItem(id, motif))}>
              Rejeter
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => valider(() => mettreEnAttenteItem(id))}>
              Mettre en attente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
