'use client'

import { useState } from 'react'
import { Card, Button, Input, Modal } from '@/components/ui'
import type { ExperienceItem, ExperienceResponse, DeleteExperienceResponse } from '@/types/profil'

interface FormData {
  poste:        string
  organisation: string
  dateDebut:    string
  dateFin:      string
  description:  string
}

const emptyForm: FormData = { poste: '', organisation: '', dateDebut: '', dateFin: '', description: '' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
}

interface Props {
  experiences:   ExperienceItem[]
  onScoreChange: (score: number) => void
}

export function SectionExperiences({ experiences: initial, onScoreChange }: Props) {
  const [items,        setItems]        = useState<ExperienceItem[]>(initial)
  const [modal,        setModal]        = useState<'add' | 'edit' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExperienceItem | null>(null)
  const [editing,      setEditing]      = useState<ExperienceItem | null>(null)
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

  function openEdit(exp: ExperienceItem) {
    setForm({
      poste:        exp.poste,
      organisation: exp.organisation,
      dateDebut:    exp.dateDebut,
      dateFin:      exp.dateFin ?? '',
      description:  exp.description ?? '',
    })
    setEditing(exp)
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
    const url    = isEdit ? `/api/profil/experiences/${editing.id}` : '/api/profil/experiences'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poste:        form.poste,
          organisation: form.organisation,
          dateDebut:    form.dateDebut,
          dateFin:      form.dateFin || null,
          description:  form.description || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur')

      const { completionScore, ...saved } = json.data as ExperienceResponse
      setItems(prev =>
        isEdit
          ? prev.map(e => e.id === saved.id ? saved : e)
          : [saved, ...prev]
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
      const res = await fetch(`/api/profil/experiences/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur lors de la suppression')

      const { completionScore } = json.data as DeleteExperienceResponse
      setItems(prev => prev.filter(e => e.id !== deleteTarget.id))
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
          <h2 className="text-fs-400 font-bold text-color-text-primary">Expériences</h2>
          <Button variant="ghost" size="sm" onClick={openAdd}>+ Ajouter</Button>
        </div>

        {items.length === 0 ? (
          <p className="text-fs-300 text-color-text-secondary italic">Aucune expérience ajoutée.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gj-line">
            {items.map(exp => (
              <div key={exp.id} className="py-space-3 first:pt-0 last:pb-0">
                <div className="flex justify-between items-start gap-space-2">
                  <div className="min-w-0">
                    <p className="font-bold text-fs-300 text-color-text-primary truncate">{exp.poste}</p>
                    <p className="text-fs-300 text-color-text-secondary">{exp.organisation}</p>
                    <p className="text-fs-200 text-color-text-secondary mt-space-1">
                      {formatDate(exp.dateDebut)} — {exp.dateFin ? formatDate(exp.dateFin) : "Aujourd'hui"}
                    </p>
                    {exp.description && (
                      <p className="text-fs-300 text-color-text-secondary mt-space-2 line-clamp-2">{exp.description}</p>
                    )}
                  </div>
                  <div className="flex gap-space-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(exp)}>Éditer</Button>
                    <Button variant="danger" size="sm" onClick={() => { setDeleteTarget(exp); setDeleteError(null) }}>
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
        title={modal === 'add' ? 'Ajouter une expérience' : "Modifier l'expérience"}
      >
        <div className="flex flex-col gap-space-4">
          <Input id="poste" label="Poste" required value={form.poste}
            onChange={e => set('poste', e.target.value)} placeholder="Ex : Développeur web" />
          <Input id="org" label="Organisation" required value={form.organisation}
            onChange={e => set('organisation', e.target.value)} placeholder="Ex : CJS Dakar" />
          <div className="grid grid-cols-2 gap-space-3">
            <Input id="debut" label="Date de début" type="date" required
              value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)} />
            <Input id="fin" label="Date de fin" type="date"
              value={form.dateFin} onChange={e => set('dateFin', e.target.value)}
              hint="Laisser vide si en cours" />
          </div>
          <div className="flex flex-col gap-space-1">
            <label htmlFor="desc" className="text-fs-300 font-bold text-color-text-primary">Description</label>
            <textarea
              id="desc" rows={3} maxLength={1000} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Décrivez vos missions..."
              className="w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
                focus:border-gj-teal-deep focus:outline-none focus:ring-[3px] focus:ring-[rgba(0,178,135,.18)]
                text-[16px] font-[inherit] resize-none"
            />
          </div>
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
        title="Supprimer l'expérience"
      >
        <p className="text-fs-300 text-color-text-secondary mb-space-4">
          Supprimer <strong>{deleteTarget?.poste}</strong> chez <strong>{deleteTarget?.organisation}</strong> ?
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
