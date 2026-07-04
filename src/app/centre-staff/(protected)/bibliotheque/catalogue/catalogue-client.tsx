'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Modal, Input, Select, Toast, Icon, EmptyState } from '@/components/ui'
import type { LivreVue } from '@/lib/bibliotheque/service'
import { BookCover } from '@/components/bibliotheque/BookCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  centreId: string
  livres: LivreVue[]
}

interface LivreFormData {
  titre: string
  auteur: string
  theme: string
  isbn: string
  niveau: string
  langue: string
  resume: string
  couvertureUrl: string
}

interface ExemplaireFormData {
  codeBarre: string
  rayon: string
  etagere: string
  position: string
}

type ToastState = { message: string; variant: 'success' | 'danger' } | null

// ── Constantes ────────────────────────────────────────────────────────────────

const DEFAULT_LIVRE: LivreFormData = {
  titre: '',
  auteur: '',
  theme: '',
  isbn: '',
  niveau: '',
  langue: 'fr',
  resume: '',
  couvertureUrl: '',
}

const DEFAULT_EXEMPLAIRE: ExemplaireFormData = {
  codeBarre: '',
  rayon: '',
  etagere: '',
  position: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLivrePayload(data: LivreFormData) {
  return {
    titre: data.titre.trim(),
    auteur: data.auteur.trim(),
    theme: data.theme,
    isbn: data.isbn.trim() || null,
    niveau: data.niveau || null,
    langue: data.langue || 'fr',
    resume: data.resume.trim() || null,
    couvertureUrl: data.couvertureUrl.trim() || null,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CatalogueClient({ centreId, livres: initialLivres }: Props) {
  const router = useRouter()

  // Modal state
  const [modalLivreCreate, setModalLivreCreate] = useState(false)
  const [modalLivreEdit, setModalLivreEdit] = useState<LivreVue | null>(null)
  const [modalExemplaireCreate, setModalExemplaireCreate] = useState<string | null>(null) // livreId
  const [modalExemplaireEdit, setModalExemplaireEdit] = useState<{
    exemplaireId: string
    livreId: string
    current: { rayon: string; etagere: string; position: string; statut: string }
  } | null>(null)
  const [confirmDeleteLivre, setConfirmDeleteLivre] = useState<LivreVue | null>(null)
  const [confirmDeleteExemplaire, setConfirmDeleteExemplaire] = useState<string | null>(null) // exemplaireId

  // Form state
  const [livreForm, setLivreForm] = useState<LivreFormData>(DEFAULT_LIVRE)
  const [exemplaireForm, setExemplaireForm] = useState<ExemplaireFormData>(DEFAULT_EXEMPLAIRE)
  const [exemplaireEditForm, setExemplaireEditForm] = useState<{
    rayon: string; etagere: string; position: string; statut: string
  }>({ rayon: '', etagere: '', position: '', statut: 'disponible' })

  // Loading + toast
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  // Expanded livres (pour voir les exemplaires)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpand(livreId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(livreId)) next.delete(livreId)
      else next.add(livreId)
      return next
    })
  }

  function showToast(message: string, variant: 'success' | 'danger') {
    setToast({ message, variant })
  }

  async function apiCall(
    url: string,
    method: string,
    body?: unknown,
  ): Promise<boolean> {
    setSubmitting(true)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'same-origin',
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        showToast(json.error ?? 'Une erreur est survenue.', 'danger')
        return false
      }
      return true
    } catch {
      showToast('Impossible de contacter le serveur.', 'danger')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  // ── Livres CRUD ──────────────────────────────────────────────────────────

  function openCreateLivre() {
    setLivreForm(DEFAULT_LIVRE)
    setModalLivreCreate(true)
  }

  function openEditLivre(livre: LivreVue) {
    setLivreForm({
      titre: livre.titre,
      auteur: livre.auteur,
      theme: livre.theme,
      isbn: livre.isbn ?? '',
      niveau: livre.niveau ?? '',
      langue: livre.langue,
      resume: livre.resume ?? '',
      couvertureUrl: livre.couvertureUrl ?? '',
    })
    setModalLivreEdit(livre)
  }

  async function handleCreateLivre() {
    if (!livreForm.titre.trim() || !livreForm.auteur.trim() || !livreForm.theme) return
    const ok = await apiCall('/api/bibliotheque/admin/livres', 'POST', buildLivrePayload(livreForm))
    if (ok) {
      setModalLivreCreate(false)
      showToast('Livre créé avec succès.', 'success')
      router.refresh()
    }
  }

  async function handleEditLivre() {
    if (!modalLivreEdit) return
    if (!livreForm.titre.trim() || !livreForm.auteur.trim() || !livreForm.theme) return
    const ok = await apiCall(
      `/api/bibliotheque/admin/livres/${encodeURIComponent(modalLivreEdit.id)}`,
      'PATCH',
      buildLivrePayload(livreForm),
    )
    if (ok) {
      setModalLivreEdit(null)
      showToast('Livre modifié avec succès.', 'success')
      router.refresh()
    }
  }

  async function handleDeleteLivre() {
    if (!confirmDeleteLivre) return
    const ok = await apiCall(
      `/api/bibliotheque/admin/livres/${encodeURIComponent(confirmDeleteLivre.id)}`,
      'DELETE',
    )
    if (ok) {
      setConfirmDeleteLivre(null)
      showToast('Livre supprimé.', 'success')
      router.refresh()
    }
  }

  // ── Exemplaires CRUD ─────────────────────────────────────────────────────

  function openCreateExemplaire(livreId: string) {
    setExemplaireForm(DEFAULT_EXEMPLAIRE)
    setModalExemplaireCreate(livreId)
  }

  function openEditExemplaire(exemplaireId: string, livreId: string, current: {
    rayon: string; etagere: string; position: string; statut: string
  }) {
    setExemplaireEditForm({
      rayon: current.rayon,
      etagere: current.etagere,
      position: current.position,
      statut: current.statut,
    })
    setModalExemplaireEdit({ exemplaireId, livreId, current })
  }

  async function handleCreateExemplaire() {
    if (!modalExemplaireCreate) return
    if (!exemplaireForm.codeBarre.trim() || !exemplaireForm.rayon.trim()) return
    const ok = await apiCall('/api/bibliotheque/admin/exemplaires', 'POST', {
      livreId: modalExemplaireCreate,
      codeBarre: exemplaireForm.codeBarre.trim(),
      rayon: exemplaireForm.rayon.trim(),
      etagere: exemplaireForm.etagere.trim(),
      position: exemplaireForm.position.trim(),
    })
    if (ok) {
      setModalExemplaireCreate(null)
      showToast('Exemplaire ajouté.', 'success')
      router.refresh()
    }
  }

  async function handleEditExemplaire() {
    if (!modalExemplaireEdit) return
    const ok = await apiCall(
      `/api/bibliotheque/admin/exemplaires/${encodeURIComponent(modalExemplaireEdit.exemplaireId)}`,
      'PATCH',
      {
        rayon: exemplaireEditForm.rayon.trim() || undefined,
        etagere: exemplaireEditForm.etagere.trim() || undefined,
        position: exemplaireEditForm.position.trim() || undefined,
        statut: (exemplaireEditForm.statut === 'disponible' || exemplaireEditForm.statut === 'indisponible')
          ? exemplaireEditForm.statut
          : undefined,
      },
    )
    if (ok) {
      setModalExemplaireEdit(null)
      showToast('Exemplaire modifié.', 'success')
      router.refresh()
    }
  }

  async function handleDeleteExemplaire() {
    if (!confirmDeleteExemplaire) return
    const ok = await apiCall(
      `/api/bibliotheque/admin/exemplaires/${encodeURIComponent(confirmDeleteExemplaire)}`,
      'DELETE',
    )
    if (ok) {
      setConfirmDeleteExemplaire(null)
      showToast('Exemplaire supprimé.', 'success')
      router.refresh()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-space-4">
      {/* Bouton créer livre */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={openCreateLivre}>
          <Icon name="plus" size={16} />
          Ajouter un livre
        </Button>
      </div>

      {/* Liste des livres */}
      {initialLivres.length === 0 ? (
        <EmptyState
          illustration="inbox"
          title="Aucun livre dans ce centre"
          description="Ajoute des livres au catalogue pour les rendre disponibles à l'emprunt."
          actions={[{ label: 'Ajouter un livre', onClick: openCreateLivre, variant: 'primary' }]}
        />
      ) : (
        <ul className="flex flex-col gap-space-3 list-none p-0 m-0">
          {initialLivres.map((livre) => {
            const isExpanded = expanded.has(livre.id)
            // Only emplacements belonging to this centre
            const exemplairesCentre = livre.emplacements.filter((e) => e.centreId === centreId)

            return (
              <li key={livre.id}>
                <Card variant="default">
                  {/* Header livre */}
                  <div className="flex items-start justify-between gap-space-3">
                    <button
                      type="button"
                      className="flex gap-space-3 flex-1 min-w-0 text-left"
                      onClick={() => toggleExpand(livre.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex-shrink-0" style={{ width: 44, height: 60 }}>
                        <BookCover titre={livre.titre} auteur={livre.auteur} couvertureUrl={livre.couvertureUrl} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-fs-300 font-bold text-color-text-primary line-clamp-2">
                          {livre.titre}
                        </p>
                        <p className="text-fs-200 text-color-text-secondary truncate">{livre.auteur}</p>
                        <div className="flex items-center gap-space-2 mt-space-1">
                          <span
                            className="text-fs-100 font-bold rounded-gj-pill"
                            style={{
                              background: 'var(--gj-teal-soft)',
                              color: 'var(--gj-teal-deep)',
                              padding: '2px 8px',
                            }}
                          >
                            {livre.theme}
                          </span>
                          <span className="text-fs-200 text-color-text-muted">
                            {exemplairesCentre.length} ex. dans ce centre
                          </span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-space-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditLivre(livre)}
                        aria-label={`Modifier ${livre.titre}`}
                      >
                        <Icon name="settings" size={14} />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmDeleteLivre(livre)}
                        aria-label={`Supprimer ${livre.titre}`}
                      >
                        <Icon name="close" size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Exemplaires (expanded) */}
                  {isExpanded && (
                    <div className="mt-space-4 flex flex-col gap-space-3">
                      <div className="flex items-center justify-between">
                        <p className="text-fs-200 font-bold text-color-text-secondary uppercase tracking-wide">
                          Exemplaires de ce centre
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCreateExemplaire(livre.id)}
                        >
                          <Icon name="plus" size={14} />
                          Ajouter
                        </Button>
                      </div>

                      {exemplairesCentre.length === 0 ? (
                        <p className="text-fs-200 text-color-text-muted italic">
                          Aucun exemplaire dans ce centre.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-space-2 list-none p-0 m-0">
                          {exemplairesCentre.map((emp) => (
                            <li
                              key={emp.exemplaireId}
                              className="flex items-center justify-between gap-space-3 p-space-3 rounded-gj-sm"
                              style={{ background: 'var(--gj-bg)', border: '1px solid var(--gj-line)' }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-fs-200 font-bold text-color-text-primary">
                                  Rayon {emp.rayon} · Étagère {emp.etagere} · Pos. {emp.position}
                                </p>
                                <div className="flex items-center gap-space-2 mt-space-1">
                                  <span
                                    className="text-fs-100 font-bold rounded-gj-pill"
                                    style={{
                                      background: emp.statut === 'disponible' ? 'var(--gj-teal-soft)' : 'var(--gj-red-soft, #fee2e2)',
                                      color: emp.statut === 'disponible' ? 'var(--gj-teal-deep)' : 'var(--gj-red)',
                                      padding: '1px 8px',
                                    }}
                                  >
                                    {emp.statut}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-space-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    openEditExemplaire(emp.exemplaireId, livre.id, {
                                      rayon: emp.rayon,
                                      etagere: emp.etagere,
                                      position: emp.position,
                                      statut: emp.statut,
                                    })
                                  }
                                  aria-label="Modifier l'exemplaire"
                                >
                                  <Icon name="settings" size={13} />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setConfirmDeleteExemplaire(emp.exemplaireId)}
                                  aria-label="Supprimer l'exemplaire"
                                >
                                  <Icon name="close" size={13} />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {/* Créer livre */}
      <Modal
        isOpen={modalLivreCreate}
        onClose={() => setModalLivreCreate(false)}
        title="Ajouter un livre"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalLivreCreate(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              disabled={!livreForm.titre.trim() || !livreForm.auteur.trim() || !livreForm.theme}
              onClick={() => void handleCreateLivre()}
            >
              Créer
            </Button>
          </>
        }
      >
        <LivreForm data={livreForm} onChange={setLivreForm} />
      </Modal>

      {/* Modifier livre */}
      <Modal
        isOpen={modalLivreEdit !== null}
        onClose={() => setModalLivreEdit(null)}
        title="Modifier le livre"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalLivreEdit(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              disabled={!livreForm.titre.trim() || !livreForm.auteur.trim() || !livreForm.theme}
              onClick={() => void handleEditLivre()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <LivreForm data={livreForm} onChange={setLivreForm} />
      </Modal>

      {/* Confirmer suppression livre */}
      <Modal
        isOpen={confirmDeleteLivre !== null}
        onClose={() => setConfirmDeleteLivre(null)}
        title="Supprimer le livre"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteLivre(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={submitting}
              onClick={() => void handleDeleteLivre()}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-fs-300 text-color-text-secondary">
          Supprimer{' '}
          <strong className="text-color-text-primary">{confirmDeleteLivre?.titre}</strong> et tous ses
          exemplaires ? Cette action est irréversible.
        </p>
      </Modal>

      {/* Ajouter exemplaire */}
      <Modal
        isOpen={modalExemplaireCreate !== null}
        onClose={() => setModalExemplaireCreate(null)}
        title="Ajouter un exemplaire"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalExemplaireCreate(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              disabled={!exemplaireForm.codeBarre.trim() || !exemplaireForm.rayon.trim()}
              onClick={() => void handleCreateExemplaire()}
            >
              Ajouter
            </Button>
          </>
        }
      >
        <ExemplaireCreateForm data={exemplaireForm} onChange={setExemplaireForm} />
      </Modal>

      {/* Modifier exemplaire */}
      <Modal
        isOpen={modalExemplaireEdit !== null}
        onClose={() => setModalExemplaireEdit(null)}
        title="Modifier l'exemplaire"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalExemplaireEdit(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={() => void handleEditExemplaire()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <ExemplaireEditForm
          data={exemplaireEditForm}
          onChange={setExemplaireEditForm}
        />
      </Modal>

      {/* Confirmer suppression exemplaire */}
      <Modal
        isOpen={confirmDeleteExemplaire !== null}
        onClose={() => setConfirmDeleteExemplaire(null)}
        title="Supprimer l'exemplaire"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteExemplaire(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={submitting}
              onClick={() => void handleDeleteExemplaire()}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-fs-300 text-color-text-secondary">
          Supprimer cet exemplaire ? Si un emprunt est en cours, l&apos;opération sera refusée.
        </p>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// ── Sous-formulaires ───────────────────────────────────────────────────────────

function LivreForm({
  data,
  onChange,
}: {
  data: LivreFormData
  onChange: (d: LivreFormData) => void
}) {
  function set(k: keyof LivreFormData, v: string) {
    onChange({ ...data, [k]: v })
  }

  return (
    <div className="flex flex-col gap-space-4">
      <Input
        id="livre-titre"
        label="Titre"
        required
        value={data.titre}
        onChange={(e) => set('titre', e.target.value)}
        placeholder="Ex. L'économie africaine"
      />
      <Input
        id="livre-auteur"
        label="Auteur"
        required
        value={data.auteur}
        onChange={(e) => set('auteur', e.target.value)}
        placeholder="Ex. Jean Dupont"
      />
      <Select
        id="livre-theme"
        label="Thème"
        required
        value={data.theme}
        onChange={(e) => set('theme', e.target.value)}
        placeholder="Choisir un thème"
        options={[
          'Agriculture', 'Droit', 'Economie', 'Education', 'Environnement',
          'Entrepreneuriat', 'Informatique', 'Littérature', 'Médecine', 'Sciences', 'Société',
        ].map((t) => ({ value: t, label: t }))}
      />
      <div className="grid grid-cols-2 gap-space-3">
        <Select
          id="livre-niveau"
          label="Niveau"
          value={data.niveau}
          onChange={(e) => set('niveau', e.target.value)}
          options={[
            { value: '', label: 'Non précisé' },
            { value: 'Débutant', label: 'Débutant' },
            { value: 'Intermédiaire', label: 'Intermédiaire' },
            { value: 'Avancé', label: 'Avancé' },
          ]}
        />
        <Select
          id="livre-langue"
          label="Langue"
          value={data.langue}
          onChange={(e) => set('langue', e.target.value)}
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'Anglais' },
            { value: 'ar', label: 'Arabe' },
            { value: 'wo', label: 'Wolof' },
          ]}
        />
      </div>
      <Input
        id="livre-isbn"
        label="ISBN (optionnel)"
        value={data.isbn}
        onChange={(e) => set('isbn', e.target.value)}
        placeholder="978-…"
      />
      <Input
        id="livre-couverture"
        label="URL couverture (optionnel)"
        value={data.couvertureUrl}
        onChange={(e) => set('couvertureUrl', e.target.value)}
        placeholder="https://…"
        type="url"
      />
      <div className="flex flex-col gap-space-1">
        <label htmlFor="livre-resume" className="text-fs-300 font-bold text-color-text-primary">
          Résumé (optionnel)
        </label>
        <textarea
          id="livre-resume"
          value={data.resume}
          onChange={(e) => set('resume', e.target.value)}
          rows={3}
          placeholder="Brève description du livre…"
          className="w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] border-gj-line
            bg-white font-[inherit] text-[16px] focus:outline-none
            focus:border-gj-teal-deep focus:ring-[3px] focus:ring-[var(--focus-ring-soft)]
            resize-y min-h-[80px]"
        />
      </div>
    </div>
  )
}

function ExemplaireCreateForm({
  data,
  onChange,
}: {
  data: ExemplaireFormData
  onChange: (d: ExemplaireFormData) => void
}) {
  function set(k: keyof ExemplaireFormData, v: string) {
    onChange({ ...data, [k]: v })
  }

  return (
    <div className="flex flex-col gap-space-4">
      <Input
        id="ex-codebarre"
        label="Code-barre"
        required
        value={data.codeBarre}
        onChange={(e) => set('codeBarre', e.target.value)}
        placeholder="EX-2024-001"
      />
      <div className="grid grid-cols-3 gap-space-3">
        <Input
          id="ex-rayon"
          label="Rayon"
          required
          value={data.rayon}
          onChange={(e) => set('rayon', e.target.value)}
          placeholder="A"
        />
        <Input
          id="ex-etagere"
          label="Étagère"
          value={data.etagere}
          onChange={(e) => set('etagere', e.target.value)}
          placeholder="3"
        />
        <Input
          id="ex-position"
          label="Position"
          value={data.position}
          onChange={(e) => set('position', e.target.value)}
          placeholder="12"
        />
      </div>
    </div>
  )
}

function ExemplaireEditForm({
  data,
  onChange,
}: {
  data: { rayon: string; etagere: string; position: string; statut: string }
  onChange: (d: { rayon: string; etagere: string; position: string; statut: string }) => void
}) {
  function set(k: string, v: string) {
    onChange({ ...data, [k]: v })
  }

  return (
    <div className="flex flex-col gap-space-4">
      <div className="grid grid-cols-3 gap-space-3">
        <Input
          id="ex-edit-rayon"
          label="Rayon"
          value={data.rayon}
          onChange={(e) => set('rayon', e.target.value)}
        />
        <Input
          id="ex-edit-etagere"
          label="Étagère"
          value={data.etagere}
          onChange={(e) => set('etagere', e.target.value)}
        />
        <Input
          id="ex-edit-position"
          label="Position"
          value={data.position}
          onChange={(e) => set('position', e.target.value)}
        />
      </div>
      <Select
        id="ex-edit-statut"
        label="Statut"
        value={data.statut}
        onChange={(e) => set('statut', e.target.value)}
        options={[
          { value: 'disponible', label: 'Disponible' },
          { value: 'indisponible', label: 'Indisponible' },
        ]}
      />
    </div>
  )
}

