'use client'

import { useState } from 'react'
import { Card, Button, Input, Modal } from '@/components/ui'
import { ProfilFileUploadButton } from './ProfilFileUploadButton'
import type { CertificatItem } from '@/types/profil'

interface Props {
  certificats: CertificatItem[]
}

interface FormData {
  formation: string
  organisme: string
  obtenuLe:  string
}

const emptyForm: FormData = { formation: '', organisme: '', obtenuLe: new Date().toISOString().slice(0, 10) }

export function SectionCertificats({ certificats }: Props) {
  const [items, setItems]   = useState<CertificatItem[]>(certificats)
  const [modal, setModal]   = useState(false)
  const [form,  setForm]    = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<CertificatItem | null>(null)
  const [deleting,     setDeleting]     = useState(false)
  const [deleteError,  setDeleteError]  = useState<string | null>(null)

  function openAdd() {
    setForm(emptyForm)
    setError(null)
    setModal(true)
  }

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profil/certificats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation: form.formation,
          organisme: form.organisme || null,
          obtenuLe:  form.obtenuLe,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur')
      const created = json.data as CertificatItem
      setItems(prev => [created, ...prev].sort((a, b) => (a.obtenuLe < b.obtenuLe ? 1 : -1)))
      setModal(false)
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
      const res = await fetch(`/api/profil/certificats/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur lors de la suppression')
      setItems(prev => prev.filter(x => x.id !== deleteTarget.id))
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
          <h2 className="text-fs-400 font-bold text-color-text-primary">Certifications</h2>
          <Button variant="ghost" size="sm" onClick={openAdd}>+ Ajouter</Button>
        </div>

        {items.length === 0 ? (
          <p className="text-fs-300 text-color-text-secondary italic">
            Aucune certification ajoutée. Ajoute manuellement tes certifications ou
            importe-les depuis Moodle.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-gj-line">
            {items.map(c => (
              <div key={c.id} className="py-space-3 first:pt-0 last:pb-0 flex flex-col gap-space-2">
                <div className="flex justify-between items-start gap-space-3">
                  <div className="min-w-0">
                    <p className="font-medium text-fs-300 text-color-text-primary">{c.formation}</p>
                    <p className="text-fs-200 text-color-text-secondary">
                      Obtenu le {new Date(c.obtenuLe).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-space-2 flex-shrink-0">
                    {c.urlCertificat && (
                      <a
                        href={c.urlCertificat}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fs-200 text-gj-teal-deep font-bold hover:underline"
                      >
                        Voir Moodle
                      </a>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => { setDeleteTarget(c); setDeleteError(null) }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
                <ProfilFileUploadButton
                  url={`/api/profil/certificats/${c.id}/upload`}
                  currentUrl={c.fichierUrl}
                  emptyLabel="Joindre le certificat"
                  replaceLabel="Remplacer le certificat"
                  onUploaded={fichierUrl =>
                    setItems(prev => prev.map(x => x.id === c.id ? { ...x, fichierUrl } : x))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal ajout manuel */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Ajouter une certification"
      >
        <div className="flex flex-col gap-space-4">
          <Input
            id="formation" label="Intitulé de la formation" required
            value={form.formation} onChange={e => set('formation', e.target.value)}
            placeholder="Ex : Certification PMP"
          />
          <Input
            id="organisme" label="Organisme (optionnel)"
            value={form.organisme} onChange={e => set('organisme', e.target.value)}
            placeholder="Ex : PMI"
          />
          <Input
            id="obtenuLe" label="Date d'obtention" type="date" required
            value={form.obtenuLe} onChange={e => set('obtenuLe', e.target.value)}
          />
          <p className="text-fs-200 text-color-text-secondary italic">
            Tu pourras joindre un scan du certificat après l&apos;avoir enregistré.
          </p>
          {error && <p className="text-fs-200 text-gj-red">{error}</p>}
          <div className="flex gap-space-3">
            <Button onClick={save} loading={saving}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer la certification"
      >
        <p className="text-fs-300 text-color-text-secondary mb-space-4">
          Supprimer <strong>{deleteTarget?.formation}</strong> ? Cette action est irréversible.
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
