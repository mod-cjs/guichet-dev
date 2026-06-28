'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { approuverOpportunite, rejeterOpportunite } from './actions'

type ResultHandler = (message: string, variant: ToastVariant) => void

// ─── types ────────────────────────────────────────────────────────────────────

export interface ModerationItem {
  id: string
  /** Slug de l'offre pour l'aperçu sur la page publique */
  slug: string
  titre: string
  /** Libellé du type d'opportunité (Emploi, Stage, Bourse, …) */
  typeLabel: string
  /** Annonceur */
  organisation: string
  /** Date de soumission, relative, formatée serveur */
  dateLabel: string
}

export interface AdminModerationListProps {
  items: ModerationItem[]
  total: number
  /** Page courante (1-based) — défaut 1 */
  currentPage?: number
  /** Nombre total de pages — défaut 1 (pas de pagination) */
  totalPages?: number
}

// ─── card ─────────────────────────────────────────────────────────────────────

function ModerationCard({ item, onResult }: { item: ModerationItem; onResult: ResultHandler }) {
  const [pending, startTransition] = useTransition()

  // MOD-02 — confirmation explicite (action irréversible, contenu public) + feedback.
  function handleApprouver() {
    if (!window.confirm(`Approuver et PUBLIER « ${item.titre} » ? Elle sera visible publiquement.`)) return
    startTransition(async () => {
      try {
        await approuverOpportunite(item.id)
        onResult(`« ${item.titre} » publiée.`, 'success')
      } catch {
        onResult(`Échec : « ${item.titre} » a peut-être déjà été modérée.`, 'danger')
      }
    })
  }

  // Le prompt sert AUSSI de confirmation : « Annuler » (null) interrompt le rejet.
  function handleRejeter() {
    const motif = window.prompt(`Rejeter « ${item.titre} ». Motif (optionnel, journalisé) :`, '')
    if (motif === null) return
    startTransition(async () => {
      try {
        await rejeterOpportunite(item.id, motif || undefined)
        onResult(`« ${item.titre} » rejetée.`, 'success')
      } catch {
        onResult(`Échec : « ${item.titre} » a peut-être déjà été modérée.`, 'danger')
      }
    })
  }

  return (
    <div
      className="rounded-[14px] p-[18px]"
      style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}
    >
      <div className="flex items-start gap-[12px]">
        <span
          className="inline-flex items-center justify-center rounded-[10px] shrink-0"
          style={{ width: 40, height: 40, background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }}
          aria-hidden
        >
          <Icon name="document" size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide"
              style={{ background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }}
            >
              {item.typeLabel}
            </span>
            <span className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>
              {item.titre}
            </span>
          </div>
          <p className="text-[12.5px] mt-[4px]" style={{ color: 'var(--gj-grey)' }}>
            Par {item.organisation} · {item.dateLabel}
          </p>
        </div>
      </div>

      {/* Actions — pas de bloc verdict IA (donnée inexistante dans le modèle) */}
      <div className="flex items-center gap-[8px] flex-wrap mt-[14px]">
        <Button
          variant="primary"
          size="sm"
          type="button"
          disabled={pending}
          onClick={handleApprouver}
          className="inline-flex items-center gap-[6px] font-black text-[12.5px] !rounded-[9px] disabled:opacity-60 min-h-[44px]"
          style={{ background: 'var(--gj-green)' }}
        >
          <Icon name="check" size={14} />
          Approuver
        </Button>
        <button
          type="button"
          disabled={pending}
          onClick={handleRejeter}
          className="inline-flex items-center justify-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px] disabled:opacity-60"
          style={{
            background: 'var(--gj-surface)',
            color: 'var(--gj-red-ink)',
            border: '1.5px solid var(--gj-red)',
          }}
        >
          <Icon name="close" size={14} />
          Rejeter
        </button>
        <a
          href={`/admin/opportunites/${item.id}/apercu`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px]"
          style={{
            background: 'var(--gj-surface)',
            color: 'var(--gj-grey)',
            border: '1.5px solid var(--gj-line)',
          }}
        >
          <Icon name="eye" size={14} />
          Aperçu
        </a>
      </div>
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

/**
 * AdminModerationList — Lot 11 admin · Modération.
 *
 * Mapping HONNÊTE : la file = opportunités `statut = brouillon` (publications
 * rédigées en attente de validation avant mise en ligne). Le modèle Prisma n'a
 * aucun champ de verdict/conformité IA (RecommandationIA = matching jeune↔offre,
 * pas une modération) → AUCUN bloc verdict IA n'est rendu.
 */
export function AdminModerationList({ items, total, currentPage = 1, totalPages = 1 }: AdminModerationListProps) {
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const onResult: ResultHandler = (message, variant) => setFeedback({ message, variant })

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div className="mb-4">
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>
            Modération
          </h1>
          <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
            {total} publications en attente de validation
          </p>
        </div>

        {items.length === 0 ? (
          <div
            className="rounded-[14px] p-[32px] text-center"
            style={{
              background: 'var(--gj-surface)',
              border: '1.5px solid var(--gj-line)',
              color: 'var(--gj-grey)',
            }}
          >
            <Icon name="check-circle" size={32} className="mx-auto mb-[10px] opacity-40" />
            <p className="text-[14px] font-bold">Aucune publication en attente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {items.map((item) => (
              <ModerationCard key={item.id} item={item} onResult={onResult} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl="/admin/opportunites"
              ariaLabel="Pagination"
            />
          </div>
        )}
      </div>

      {feedback && (
        <Toast
          message={feedback.message}
          variant={feedback.variant}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  )
}
