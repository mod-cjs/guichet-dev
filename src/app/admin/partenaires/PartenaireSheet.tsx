'use client'

import { useTransition, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/Sheet'
import { Icon } from '@/components/ui/Icon'
import { RichContent } from '@/components/ui/RichContent'
import type { ToastVariant } from '@/components/ui/Toast'
import { sectorLabel, sectorVar } from '@/lib/partenaire-secteur'
import { basculerVerifiePartenaire } from './actions'
import type { PartenaireRow } from './AdminPartenairesTable'

export interface PartenaireSheetProps {
  /** Partenaire ouvert (null = fermé). */
  partenaire: PartenaireRow | null
  onClose: () => void
  /** Ouvre le formulaire d'édition (géré par le parent). */
  onEdit: (p: PartenaireRow) => void
  onToast: (message: string, variant: ToastVariant) => void
}

const actBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 800,
  fontSize: 12.5,
  borderRadius: 9,
  padding: '9px 14px',
  minHeight: 44,
  cursor: 'pointer',
  textDecoration: 'none',
}

/**
 * PartenaireSheet — dossier slide-over d'une organisation recruteur (GUIC-681).
 *
 * Dossier rapide (secteur, région, email, description, offres) + actions
 * **Vérifier** et **Éditer**, plus un lien vers la fiche complète (compte
 * recruteur + suspension + toutes les offres, qui nécessitent le chargement serveur).
 */
export function PartenaireSheet({ partenaire: p, onClose, onEdit, onToast }: PartenaireSheetProps) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function toggleVerifie() {
    if (!p) return
    startTransition(async () => {
      try {
        await basculerVerifiePartenaire(p.id, !p.estVerifie)
        onToast(p.estVerifie ? `« ${p.nom} » dévérifié.` : `« ${p.nom} » vérifié.`, 'success')
        router.refresh()
        onClose()
      } catch {
        onToast('Action impossible.', 'danger')
      }
    })
  }

  return (
    <Sheet isOpen={!!p} onClose={onClose} title={p?.nom ?? ''}>
      {p && (
        <div className="flex flex-col gap-space-4" style={{ ['--sc']: `var(${sectorVar(p.secteur)})` } as CSSProperties}>
          {/* En-tête dossier */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              aria-hidden
              style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, display: 'inline-grid', placeItems: 'center', color: '#fff', fontWeight: 900, fontSize: 15, background: 'rgb(var(--sc))', boxShadow: 'var(--gj-edge)' }}
            >
              {p.nom.slice(0, 2).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--gj-grey)' }}>
                {sectorLabel(p.secteur)}
                {p.region ? ` · ${p.region.replace(/_/g, ' ')}` : ''}
              </div>
              {p.estVerifie ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, borderRadius: 999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', padding: '3px 8px', background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)' }}>
                  <Icon name="check-circle" size={11} /> Vérifié
                </span>
              ) : (
                <span style={{ display: 'inline-block', marginTop: 4, borderRadius: 999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', padding: '3px 8px', background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }}>
                  Non vérifié
                </span>
              )}
            </div>
          </div>

          {/* Coordonnées / stats */}
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', margin: 0 }}>
            <div>
              <dt style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gj-grey)' }}>Email</dt>
              <dd style={{ margin: 0, fontSize: 13, color: 'var(--gj-ink)', wordBreak: 'break-word' }}>{p.email || '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gj-grey)' }}>Offres publiées</dt>
              <dd style={{ margin: 0, fontSize: 13, color: 'var(--gj-ink)', fontWeight: 700 }}>{p.opportunitesCount}</dd>
            </div>
          </dl>

          {/* Présentation */}
          {p.description ? (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gj-grey)', marginBottom: 6 }}>Présentation</div>
              <RichContent html={p.description} className="text-[13px]" />
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-space-2" style={{ paddingTop: 4, borderTop: '1px solid var(--gj-line)' }}>
            <button
              type="button"
              disabled={pending}
              onClick={toggleVerifie}
              style={{ ...actBtn, background: p.estVerifie ? 'transparent' : 'var(--gj-green-ink)', color: p.estVerifie ? 'var(--gj-grey)' : '#fff', border: p.estVerifie ? '1.5px solid var(--gj-line)' : 'none', opacity: pending ? 0.6 : 1 }}
            >
              <Icon name={p.estVerifie ? 'close' : 'check'} size={14} /> {p.estVerifie ? 'Dévérifier' : 'Vérifier'}
            </button>
            <button
              type="button"
              onClick={() => onEdit(p)}
              style={{ ...actBtn, background: 'transparent', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-teal)' }}
            >
              <Icon name="settings" size={14} /> Éditer
            </button>
            <Link
              href={`/admin/partenaires/${p.id}`}
              style={{ ...actBtn, marginLeft: 'auto', background: 'transparent', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}
            >
              Fiche complète <Icon name="chevron-right" size={14} />
            </Link>
          </div>
        </div>
      )}
    </Sheet>
  )
}
