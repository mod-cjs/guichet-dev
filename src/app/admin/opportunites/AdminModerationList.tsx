'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { approuverOpportunite, rejeterOpportunite } from './actions'

// ─── types ────────────────────────────────────────────────────────────────────

export interface ModerationItem {
  id: string
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
}

// ─── card ─────────────────────────────────────────────────────────────────────

function ModerationCard({ item }: { item: ModerationItem }) {
  const [pending, startTransition] = useTransition()
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
          onClick={() => startTransition(() => { void approuverOpportunite(item.id) })}
          className="inline-flex items-center gap-[6px] font-black text-[12.5px] !rounded-[9px] disabled:opacity-60"
          style={{ background: 'var(--gj-green)' }}
        >
          <Icon name="check" size={14} />
          Approuver
        </Button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => { void rejeterOpportunite(item.id) })}
          className="inline-flex items-center gap-[6px] font-black text-[12.5px] rounded-[9px] px-[14px] py-[8px] disabled:opacity-60"
          style={{
            background: 'var(--gj-surface)',
            color: 'var(--gj-red-ink)',
            border: '1.5px solid var(--gj-red)',
          }}
        >
          <Icon name="close" size={14} />
          Rejeter
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px]"
          style={{
            background: 'var(--gj-surface)',
            color: 'var(--gj-grey)',
            border: '1.5px solid var(--gj-line)',
          }}
        >
          <Icon name="eye" size={14} />
          Aperçu
        </button>
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
export function AdminModerationList({ items, total }: AdminModerationListProps) {
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
              <ModerationCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
