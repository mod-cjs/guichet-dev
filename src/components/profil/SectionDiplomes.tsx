'use client'

import { useState } from 'react'
import { Card, Button, Input, Select, Modal, Badge } from '@/components/ui'
import { ProfilFileUploadButton } from './ProfilFileUploadButton'
import { MENTION_OPTIONS, NIVEAU_ETUDE_OPTIONS, niveauLabel, mentionLabel } from '@/lib/profil-constants'
import type { DiplomeItem, DiplomeResponse, DeleteDiplomeResponse } from '@/types/profil'

const CURRENT_YEAR = new Date().getFullYear()
const ANNEE_MIN = 1950

const ANNEE_OPTIONS = Array.from(
  { length: CURRENT_YEAR - ANNEE_MIN + 1 },
  (_, i) => {
    const y = CURRENT_YEAR - i
    return { value: String(y), label: String(y) }
  },
)

interface FormData {
  intitule:       string
  etablissement:  string
  anneeObtention: string
  niveau:         string
  mention:        string
}

const emptyForm: FormData = {
  intitule:       '',
  etablissement:  '',
  anneeObtention: String(CURRENT_YEAR),
  niveau:         'licence',
  mention:        '',
}

interface Props {
  diplomes:      DiplomeItem[]
  onScoreChange: (score: number) => void
}

export function SectionDiplomes({ diplomes: initial, onScoreChange }: Props) {
  const [items,        setItems]        = useState<DiplomeItem[]>(initial)
  const [modal,        setModal]        = useState<'add' | 'edit' | null>(null)
  const [editing,      setEditing]      = useState<DiplomeItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DiplomeItem | null>(null)
  const [form,         setForm]         = useState<FormData>(emptyForm)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [deleteError,  setDeleteError]  = useState<string | null>(null)

  function openAdd() {
    setForm(emptyForm)
    setEditing(null)
    setError(null)
    setModal('add')
  }

  function openEdit(dip: DiplomeItem) {
    setForm({
      intitule:       dip.intitule,
      etablissement:  dip.etablissement,
      anneeObtention: String(dip.anneeObtention),
      niveau:         dip.niveau,
      mention:        dip.mention ?? '',
    })
    setEditing(dip)
    setError(null)
    setModal('edit')
  }

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    const isEdit = modal === 'edit' && editing
    const url    = isEdit ? `/api/profil/diplomes/${editing.id}` : '/api/profil/diplomes'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intitule:       form.intitule,
          etablissement:  form.etablissement,
          anneeObtention: Number(form.anneeObtention),
          niveau:         form.niveau,
          mention:        form.mention || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur')

      const { completionScore, ...saved } = json.data as DiplomeResponse
      setItems(prev =>
        isEdit
          ? prev.map(d => d.id === saved.id ? saved : d)
          : [saved, ...prev].sort((a, b) => b.anneeObtention - a.anneeObtention)
      )
      onScoreChange(completionScore)
      setModal(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/profil/diplomes/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur lors de la suppression')

      const { completionScore } = json.data as DeleteDiplomeResponse
      setItems(prev => prev.filter(d => d.id !== deleteTarget.id))
      onScoreChange(completionScore)
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-space-4">
          <h2 className="text-fs-400 font-bold text-color-text-primary">Diplômes</h2>
          <Button variant="ghost" size="sm" onClick={openAdd}>+ Ajouter</Button>
        </div>

        {items.length === 0 ? (
          <p className="text-fs-300 text-color-text-secondary italic">Aucun diplôme ajouté.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gj-line">
            {items.map(dip => (
              <div key={dip.id} className="py-space-3 first:pt-0 last:pb-0">
                <div className="flex justify-between items-start gap-space-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-space-2 flex-wrap">
                      <p className="font-bold text-fs-300 text-color-text-primary truncate">{dip.intitule}</p>
                      {dip.mention && <Badge variant="teal">{mentionLabel(dip.mention)}</Badge>}
                    </div>
                    <p className="text-fs-300 text-color-text-secondary">{dip.etablissement}</p>
                    <p className="text-fs-200 text-color-text-secondary mt-space-1">
                      {niveauLabel(dip.niveau)} · {dip.anneeObtention}
                    </p>
                    <div className="mt-space-2">
                      <ProfilFileUploadButton
                        url={`/api/profil/diplomes/${dip.id}/upload`}
                        currentUrl={dip.fichierUrl}
                        emptyLabel="Joindre le scan"
                        replaceLabel="Remplacer le scan"
                        onUploaded={fichierUrl =>
                          setItems(prev => prev.map(d => d.id === dip.id ? { ...d, fichierUrl } : d))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-space-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(dip)}>Éditer</Button>
                    <Button variant="danger" size="sm" onClick={() => { setDeleteTarget(dip); setDeleteError(null) }}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal ajout / édition */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Ajouter un diplôme' : 'Modifier le diplôme'}
      >
        <div className="flex flex-col gap-space-4">
          <Input id="intitule" label="Intitulé" required value={form.intitule}
            onChange={e => set('intitule', e.target.value)} placeholder="Ex : Licence en Informatique" />
          <Input id="etablissement" label="Établissement" required value={form.etablissement}
            onChange={e => set('etablissement', e.target.value)} placeholder="Ex : Université Cheikh Anta Diop" />
          <div className="grid grid-cols-2 gap-space-3">
            <Select id="annee" label="Année d'obtention" required
              value={form.anneeObtention} onChange={e => set('anneeObtention', e.target.value)}
              options={ANNEE_OPTIONS} />
            <Select id="niveau" label="Niveau" required
              value={form.niveau} onChange={e => set('niveau', e.target.value)}
              options={NIVEAU_ETUDE_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
          </div>
          <Select id="mention" label="Mention (optionnel)"
            value={form.mention} onChange={e => set('mention', e.target.value)}
            placeholder="Aucune"
            options={MENTION_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
          {error && <p className="text-fs-200 text-gj-red">{error}</p>}
          <div className="flex gap-space-3">
            <Button onClick={save} loading={saving}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le diplôme"
      >
        <p className="text-fs-300 text-color-text-secondary mb-space-4">
          Supprimer <strong>{deleteTarget?.intitule}</strong> ({deleteTarget?.anneeObtention}) ?
          Cette action est irréversible.
        </p>
        {deleteError && <p className="text-fs-200 text-gj-red mb-space-3">{deleteError}</p>}
        <div className="flex gap-space-3">
          <Button variant="danger" onClick={confirmDelete} loading={deleting}>Supprimer</Button>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Annuler</Button>
        </div>
      </Modal>
    </>
  )
}
