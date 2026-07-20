'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { approuverItem, rejeterItem, mettreEnAttenteItem, editerItem } from '../actions'

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
  score: number
  sourceNom: string
  urlSource: string
  motifRejet: string | null
  champs: Champs
  types: Array<{ id: string; libelle: string }>
}

export function CurationDetail({
  id,
  statut,
  score,
  sourceNom,
  urlSource,
  champs: initial,
  types,
}: CurationDetailProps) {
  const router = useRouter()
  const [c, setC] = useState<Champs>(initial)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function set<K extends keyof Champs>(cle: K, val: string) {
    setC((prev) => ({ ...prev, [cle]: val }))
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
          Source : <strong>{sourceNom}</strong> · complétude {score}% · statut {statut} ·{' '}
          <a href={urlSource} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gj-teal-deep)' }}>
            voir l’annonce d’origine
          </a>
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-space-3"
          style={{ marginTop: 16 }}
        >
          <Input id="c-titre" label="Titre" value={c.titre} onChange={(e) => set('titre', e.target.value)} />
          <Textarea id="c-desc" label="Description" rows={5} value={c.description} onChange={(e) => set('description', e.target.value)} />
          <Input id="c-org" label="Organisation" value={c.organisation} onChange={(e) => set('organisation', e.target.value)} />
          <Input id="c-region" label="Région" value={c.region} onChange={(e) => set('region', e.target.value)} />
          <Input id="c-domaine" label="Domaine" value={c.domaine} onChange={(e) => set('domaine', e.target.value)} />
          <Select id="c-type" label="Type d’opportunité" options={typeOptions} value={c.typeId} onChange={(e) => set('typeId', e.target.value)} />
          <Input id="c-deadline" label="Deadline (AAAA-MM-JJ)" value={c.deadline} onChange={(e) => set('deadline', e.target.value)} />
          <Input id="c-lien" label="Lien source" type="url" value={c.lienSource} onChange={(e) => set('lienSource', e.target.value)} />

          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              agir(
                () =>
                  editerItem(id, {
                    titre: c.titre || undefined,
                    description: c.description || undefined,
                    organisation: c.organisation || undefined,
                    region: c.region || undefined,
                    domaine: c.domaine || undefined,
                    typeId: c.typeId || undefined,
                    deadline: c.deadline || undefined,
                    lienSource: c.lienSource || undefined,
                  }),
                false,
              )
            }
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

        <div className="flex items-center gap-space-2" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <Button type="button" variant="primary" disabled={pending} onClick={() => agir(() => approuverItem(id))}>
            Approuver
          </Button>
          <Button type="button" variant="danger" disabled={pending} onClick={() => agir(() => rejeterItem(id, motif))}>
            Rejeter
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => agir(() => mettreEnAttenteItem(id))}>
            Mettre en attente
          </Button>
        </div>
      </div>
    </div>
  )
}
