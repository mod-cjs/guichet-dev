'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Toast } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import type { LivreVue } from '@/lib/bibliotheque/service'
import { BookCover } from '@/components/bibliotheque/BookCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  centreId: string
  /** Nombre total de livres correspondant à la recherche (GUIC-522 F-11/F-12). */
  total: number
  /** Page courante (1-based). */
  currentPage: number
  /** Nombre total de pages. */
  totalPages: number
  /** Recherche courante (titre/auteur/ISBN). */
  q?: string
  /** Filtre thème courant. */
  theme?: string
  /** Filtre niveau courant. */
  niveau?: string
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

const THEMES = [
  'Agriculture', 'Droit', 'Economie', 'Education', 'Environnement',
  'Entrepreneuriat', 'Informatique', 'Littérature', 'Médecine', 'Sciences', 'Société',
]

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

const STATUT_LABEL: Record<string, string> = {
  disponible: 'Disponible',
  emprunte: 'Emprunté',
  reserve: 'Réservé',
  indisponible: 'Indisponible',
}

function statutColor(statut: string): { bg: string; fg: string } {
  switch (statut) {
    case 'disponible':  return { bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-deep)' }
    case 'emprunte':    return { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' }
    case 'reserve':     return { bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' }
    case 'indisponible': return { bg: 'var(--gj-red-soft)', fg: 'var(--gj-red)' }
    default:            return { bg: 'var(--gj-bg)', fg: 'var(--gj-grey)' }
  }
}

// ── Composant principal ───────────────────────────────────────────────────────

export function AdminBiblioCatalogueClient({
  centreId,
  livres: initialLivres,
  total,
  currentPage,
  totalPages,
  q = '',
  theme = '',
  niveau = '',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  // Modals
  const [modalLivreCreate, setModalLivreCreate] = useState(false)
  const [modalLivreEdit, setModalLivreEdit] = useState<LivreVue | null>(null)
  const [modalExemplaireCreate, setModalExemplaireCreate] = useState<string | null>(null) // livreId
  const [modalExemplaireEdit, setModalExemplaireEdit] = useState<{
    exemplaireId: string
    livreId: string
    current: { rayon: string; etagere: string; position: string; statut: string }
  } | null>(null)
  const [confirmDeleteLivre, setConfirmDeleteLivre] = useState<LivreVue | null>(null)
  const [confirmDeleteExemplaire, setConfirmDeleteExemplaire] = useState<string | null>(null)

  // Forms
  const [livreForm, setLivreForm] = useState<LivreFormData>(DEFAULT_LIVRE)
  const [exemplaireForm, setExemplaireForm] = useState<ExemplaireFormData>(DEFAULT_EXEMPLAIRE)
  const [exemplaireEditForm, setExemplaireEditForm] = useState<{
    rayon: string; etagere: string; position: string; statut: string
  }>({ rayon: '', etagere: '', position: '', statut: 'disponible' })

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
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

  // GUIC-522 F-06/F-07 — `error` est `{code, message}` (ApiResponse), pas une string :
  // afficher le MESSAGE MÉTIER précis renvoyé par le serveur (ex. « historique d'emprunts »)
  // au lieu d'un 500 générique.
  async function apiCall(url: string, method: string, body?: unknown): Promise<boolean> {
    setSubmitting(true)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'same-origin',
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = (await res.json()) as { error?: { code?: string; message?: string } }
      if (!res.ok) {
        showToast(json.error?.message ?? 'Une erreur est survenue.', 'danger')
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
    const ok = await apiCall('/api/admin/bibliotheque/livres', 'POST', buildLivrePayload(livreForm))
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
      `/api/admin/bibliotheque/livres/${encodeURIComponent(modalLivreEdit.id)}`,
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
      `/api/admin/bibliotheque/livres/${encodeURIComponent(confirmDeleteLivre.id)}`,
      'DELETE',
    )
    if (ok) {
      setConfirmDeleteLivre(null)
      showToast('Livre supprimé.', 'success')
      router.refresh()
    }
  }

  // ── Exemplaires CRUD ──────────────────────────────────────────────────────

  function openCreateExemplaire(livreId: string) {
    setExemplaireForm(DEFAULT_EXEMPLAIRE)
    setModalExemplaireCreate(livreId)
  }

  function openEditExemplaire(
    exemplaireId: string,
    livreId: string,
    current: { rayon: string; etagere: string; position: string; statut: string },
  ) {
    setExemplaireEditForm({ ...current })
    setModalExemplaireEdit({ exemplaireId, livreId, current })
  }

  async function handleCreateExemplaire() {
    if (!modalExemplaireCreate) return
    if (!exemplaireForm.codeBarre.trim() || !exemplaireForm.rayon.trim()) return
    const ok = await apiCall('/api/admin/bibliotheque/exemplaires', 'POST', {
      livreId: modalExemplaireCreate,
      centreId,
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
      `/api/admin/bibliotheque/exemplaires/${encodeURIComponent(modalExemplaireEdit.exemplaireId)}`,
      'PATCH',
      {
        rayon: exemplaireEditForm.rayon.trim() || undefined,
        etagere: exemplaireEditForm.etagere.trim() || undefined,
        position: exemplaireEditForm.position.trim() || undefined,
        statut:
          exemplaireEditForm.statut === 'disponible' || exemplaireEditForm.statut === 'indisponible'
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
      `/api/admin/bibliotheque/exemplaires/${encodeURIComponent(confirmDeleteExemplaire)}`,
      'DELETE',
    )
    if (ok) {
      setConfirmDeleteExemplaire(null)
      showToast('Exemplaire supprimé.', 'success')
      router.refresh()
    }
  }

  // ── Recherche + filtres (GUIC-522 F-11/F-12) — état propagé dans l'URL ─────

  function pushWith(next: { q?: string; theme?: string; niveau?: string }) {
    const sp = new URLSearchParams()
    sp.set('centreId', centreId)
    const nq = next.q ?? q
    const nt = next.theme ?? theme
    const nn = next.niveau ?? niveau
    if (nq) sp.set('q', nq)
    if (nt) sp.set('theme', nt)
    if (nn) sp.set('niveau', nn)
    startTransition(() => router.push(`${pathname}?${sp}`))
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = (new FormData(e.currentTarget).get('q')?.toString() ?? '').trim()
    pushWith({ q: value })
  }

  const paginationBase = (() => {
    const sp = new URLSearchParams()
    sp.set('centreId', centreId)
    if (q) sp.set('q', q)
    if (theme) sp.set('theme', theme)
    if (niveau) sp.set('niveau', niveau)
    return `${pathname}?${sp}`
  })()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Recherche + filtres */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <form onSubmit={handleSearchSubmit} role="search">
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Rechercher un livre (titre, auteur, ISBN)"
            placeholder="Rechercher un livre, un auteur, un ISBN… (Entrée)"
            style={{
              width: '100%',
              fontSize: 13,
              borderRadius: 10,
              padding: '9px 14px',
              background: 'var(--gj-surface)',
              border: '1.5px solid var(--gj-line)',
              color: 'var(--gj-ink)',
              fontFamily: 'inherit',
            }}
          />
        </form>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            aria-label="Filtrer par thème"
            value={theme}
            onChange={(e) => pushWith({ theme: e.target.value })}
            style={{
              padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--gj-line)',
              background: 'var(--gj-surface)', fontSize: 12.5, fontWeight: 700, color: 'var(--gj-ink)',
              fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <option value="">Tous les thèmes</option>
            {THEMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            aria-label="Filtrer par niveau"
            value={niveau}
            onChange={(e) => pushWith({ niveau: e.target.value })}
            style={{
              padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--gj-line)',
              background: 'var(--gj-surface)', fontSize: 12.5, fontWeight: 700, color: 'var(--gj-ink)',
              fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <option value="">Tous niveaux</option>
            <option value="Débutant">Débutant</option>
            <option value="Intermédiaire">Intermédiaire</option>
            <option value="Avancé">Avancé</option>
          </select>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: 0 }}>
          {total} livre{total !== 1 ? 's' : ''} au catalogue de ce centre
          {(q || theme || niveau) ? ' — filtré' : ''}.
        </p>
      </div>

      {/* Bouton créer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={openCreateLivre}>
          <Icon name="plus" size={15} />
          Ajouter un livre
        </Button>
      </div>

      {/* Liste livres */}
      {initialLivres.length === 0 ? (
        <EmptyState
          illustration="inbox"
          title="Aucun livre dans ce centre"
          description="Ajoutez des livres au catalogue pour les rendre disponibles à l'emprunt."
          actions={[{ label: 'Ajouter un livre', onClick: openCreateLivre, variant: 'primary' }]}
        />
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
          {initialLivres.map((livre) => {
            const isExpanded = expanded.has(livre.id)
            const exemplairesCentre = livre.emplacements.filter((e) => e.centreId === centreId)

            return (
              <li key={livre.id}>
                <div
                  style={{
                    background: 'var(--gj-surface)',
                    border: '1.5px solid var(--gj-line)',
                    borderRadius: 14,
                    padding: '14px 16px',
                  }}
                >
                  {/* En-tête livre */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        gap: 12,
                        flex: 1,
                        minWidth: 0,
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        font: 'inherit',
                      }}
                      onClick={() => toggleExpand(livre.id)}
                      aria-expanded={isExpanded}
                    >
                      <div style={{ flexShrink: 0, width: 44, height: 60 }}>
                        <BookCover titre={livre.titre} auteur={livre.auteur} couvertureUrl={livre.couvertureUrl} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: 'var(--gj-ink)',
                            margin: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {livre.titre}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '2px 0 0' }}>
                          {livre.auteur}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 20,
                              padding: '2px 8px',
                              background: 'var(--gj-teal-soft)',
                              color: 'var(--gj-teal-deep)',
                            }}
                          >
                            {livre.theme}
                          </span>
                          {/* GUIC-522 F-10 — compteur disponibles/total, visible sans déplier. */}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              borderRadius: 20,
                              padding: '2px 8px',
                              background: livre.exemplairesDisponibles > 0 ? 'var(--gj-green-soft)' : 'var(--gj-red-soft)',
                              color: livre.exemplairesDisponibles > 0 ? 'var(--gj-green-ink)' : 'var(--gj-red)',
                            }}
                          >
                            {livre.exemplairesDisponibles}/{livre.exemplairesTotal} disponibles
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>
                            {exemplairesCentre.length} ex. dans ce centre
                          </span>
                          <Icon
                            name={isExpanded ? 'chevron-down' : 'chevron-right'}
                            size={13}
                            style={{ color: 'var(--gj-grey)', marginLeft: 'auto' }}
                          />
                        </div>
                      </div>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        aria-label={`Modifier ${livre.titre}`}
                        onClick={() => openEditLivre(livre)}
                        style={{
                          // GUIC-522 F-16 — tap-min 44px (icône gardée à 14px).
                          minWidth: 44,
                          minHeight: 44,
                          borderRadius: 8,
                          border: '1.5px solid var(--gj-line)',
                          background: 'var(--gj-surface)',
                          color: 'var(--gj-teal-deep)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name="settings" size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Supprimer ${livre.titre}`}
                        onClick={() => setConfirmDeleteLivre(livre)}
                        style={{
                          // GUIC-522 F-16 — tap-min 44px (icône gardée à 14px).
                          minWidth: 44,
                          minHeight: 44,
                          borderRadius: 8,
                          border: '1.5px solid var(--gj-red)',
                          background: 'var(--gj-surface)',
                          color: 'var(--gj-red)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Exemplaires (accordion) */}
                  {isExpanded && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: 'var(--gj-grey)',
                            textTransform: 'uppercase',
                            letterSpacing: '.4px',
                          }}
                        >
                          Exemplaires de ce centre
                        </span>
                        <button
                          type="button"
                          onClick={() => openCreateExemplaire(livre.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 10px',
                            borderRadius: 8,
                            border: '1.5px solid var(--gj-teal-deep)',
                            background: 'transparent',
                            color: 'var(--gj-teal-deep)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            font: 'inherit',
                          }}
                        >
                          <Icon name="plus" size={13} />
                          Ajouter
                        </button>
                      </div>

                      {exemplairesCentre.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--gj-grey)', fontStyle: 'italic' }}>
                          Aucun exemplaire dans ce centre.
                        </p>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {exemplairesCentre.map((emp) => {
                            const { bg, fg } = statutColor(emp.statut)
                            return (
                              <li
                                key={emp.exemplaireId}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  padding: '10px 12px',
                                  borderRadius: 9,
                                  background: 'var(--gj-bg)',
                                  border: '1px solid var(--gj-line)',
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)', margin: 0 }}>
                                    Rayon {emp.rayon} · Étagère {emp.etagere} · Pos. {emp.position}
                                  </p>
                                  {/* GUIC-522 F-08 — code-barre visible pour la supervision/manipulation physique. */}
                                  <p style={{ fontSize: 11.5, color: 'var(--gj-grey)', margin: '2px 0 0', fontFamily: 'monospace' }}>
                                    {emp.codeBarre}
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        borderRadius: 20,
                                        padding: '1px 8px',
                                        background: bg,
                                        color: fg,
                                      }}
                                    >
                                      {STATUT_LABEL[emp.statut] ?? emp.statut}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <button
                                    type="button"
                                    aria-label="Modifier l'exemplaire"
                                    onClick={() =>
                                      openEditExemplaire(emp.exemplaireId, livre.id, {
                                        rayon: emp.rayon,
                                        etagere: emp.etagere,
                                        position: emp.position,
                                        statut: emp.statut,
                                      })
                                    }
                                    style={{
                                      // GUIC-522 F-16 — tap-min 44px (icône gardée à 13px).
                                      minWidth: 44,
                                      minHeight: 44,
                                      borderRadius: 7,
                                      border: '1.5px solid var(--gj-line)',
                                      background: 'var(--gj-surface)',
                                      color: 'var(--gj-teal-deep)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Icon name="settings" size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Supprimer l'exemplaire"
                                    onClick={() => setConfirmDeleteExemplaire(emp.exemplaireId)}
                                    style={{
                                      // GUIC-522 F-16 — tap-min 44px (icône gardée à 13px).
                                      minWidth: 44,
                                      minHeight: 44,
                                      borderRadius: 7,
                                      border: '1.5px solid var(--gj-red)',
                                      background: 'var(--gj-surface)',
                                      color: 'var(--gj-red)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Icon name="close" size={13} />
                                  </button>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Pagination (GUIC-522 F-12) — état piloté par l'URL. */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={paginationBase} ariaLabel="Pagination du catalogue" />
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}

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
            <Button variant="danger" loading={submitting} onClick={() => void handleDeleteLivre()}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-fs-300 text-color-text-secondary">
          Supprimer{' '}
          <strong className="text-color-text-primary">{confirmDeleteLivre?.titre}</strong> et tous ses
          exemplaires ? Suppression possible seulement si aucun emprunt, même passé, n&apos;existe sur
          aucun de ses exemplaires. Un exemplaire avec historique ne se supprime pas — marquez-le
          indisponible pour le retirer du fonds sans perdre l&apos;historique.
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
            <Button variant="primary" loading={submitting} onClick={() => void handleEditExemplaire()}>
              Enregistrer
            </Button>
          </>
        }
      >
        <ExemplaireEditForm data={exemplaireEditForm} onChange={setExemplaireEditForm} />
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
            <Button variant="danger" loading={submitting} onClick={() => void handleDeleteExemplaire()}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-fs-300 text-color-text-secondary">
          Supprimer cet exemplaire ? Suppression possible seulement si aucun emprunt, même passé,
          n&apos;existe sur cet exemplaire. Un exemplaire avec historique ne se supprime pas —
          marquez-le indisponible pour le retirer du fonds sans perdre l&apos;historique.
        </p>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
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
        id="admin-livre-titre"
        label="Titre"
        required
        value={data.titre}
        onChange={(e) => set('titre', e.target.value)}
        placeholder="Ex. L'économie africaine"
      />
      <Input
        id="admin-livre-auteur"
        label="Auteur"
        required
        value={data.auteur}
        onChange={(e) => set('auteur', e.target.value)}
        placeholder="Ex. Jean Dupont"
      />
      <Select
        id="admin-livre-theme"
        label="Thème"
        required
        value={data.theme}
        onChange={(e) => set('theme', e.target.value)}
        placeholder="Choisir un thème"
        options={THEMES.map((t) => ({ value: t, label: t }))}
      />
      <div className="grid grid-cols-2 gap-space-3">
        <Select
          id="admin-livre-niveau"
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
          id="admin-livre-langue"
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
        id="admin-livre-isbn"
        label="ISBN (optionnel)"
        value={data.isbn}
        onChange={(e) => set('isbn', e.target.value)}
        placeholder="978-…"
      />
      <Input
        id="admin-livre-couverture"
        label="URL couverture (optionnel)"
        value={data.couvertureUrl}
        onChange={(e) => set('couvertureUrl', e.target.value)}
        placeholder="https://…"
        type="url"
      />
      {/* GUIC-522 (F-18) — primitive Textarea (mêmes classes que le brut : zéro changement
          visuel) : cohérent avec les autres champs du formulaire (Input) et la règle ui/. */}
      <Textarea
        id="admin-livre-resume"
        label="Résumé (optionnel)"
        value={data.resume}
        onChange={(e) => set('resume', e.target.value)}
        rows={3}
        placeholder="Brève description du livre…"
      />
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
        id="admin-ex-codebarre"
        label="Code-barre"
        required
        value={data.codeBarre}
        onChange={(e) => set('codeBarre', e.target.value)}
        placeholder="EX-2024-001"
      />
      <div className="grid grid-cols-3 gap-space-3">
        <Input
          id="admin-ex-rayon"
          label="Rayon"
          required
          value={data.rayon}
          onChange={(e) => set('rayon', e.target.value)}
          placeholder="A"
        />
        <Input
          id="admin-ex-etagere"
          label="Étagère"
          value={data.etagere}
          onChange={(e) => set('etagere', e.target.value)}
          placeholder="3"
        />
        <Input
          id="admin-ex-position"
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
          id="admin-ex-edit-rayon"
          label="Rayon"
          value={data.rayon}
          onChange={(e) => set('rayon', e.target.value)}
        />
        <Input
          id="admin-ex-edit-etagere"
          label="Étagère"
          value={data.etagere}
          onChange={(e) => set('etagere', e.target.value)}
        />
        <Input
          id="admin-ex-edit-position"
          label="Position"
          value={data.position}
          onChange={(e) => set('position', e.target.value)}
        />
      </div>
      <Select
        id="admin-ex-edit-statut"
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
