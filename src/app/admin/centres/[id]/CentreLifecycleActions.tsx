'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { definirActifCentre, supprimerCentre } from '../actions'

/**
 * Actions de cycle de vie d'un centre (GUIC-687), dans l'en-tête de la fiche :
 * - Suspendre / Réactiver (bascule estActif) — réversible, préserve les rattachements.
 * - Supprimer — destructif, bloqué côté serveur si des jeunes/agents sont rattachés
 *   (CENTRE_NON_VIDE) → message invitant à suspendre plutôt.
 */
export function CentreLifecycleActions({ centreId, estActif }: { centreId: string; estActif: boolean }) {
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)
  const router = useRouter()

  function run(fn: () => Promise<unknown>, ok: string, onError: (msg: string) => string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    startTransition(async () => {
      try {
        await fn()
        setToast({ msg: ok, variant: 'success' })
        router.refresh()
      } catch (e) {
        setToast({ msg: onError(e instanceof Error ? e.message : ''), variant: 'danger' })
      }
    })
  }

  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0, borderRadius: 10,
    padding: '8px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--gj-edge)',
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(
            () => definirActifCentre(centreId, !estActif),
            estActif ? 'Centre suspendu.' : 'Centre réactivé.',
            () => 'Action impossible.',
          )
        }
        style={{ ...btn, background: 'var(--gj-surface)', color: 'var(--gj-ink)', border: '1.5px solid var(--gj-line)', opacity: pending ? 0.6 : 1 }}
      >
        <Icon name={estActif ? 'eye-off' : 'eye'} size={14} /> {estActif ? 'Suspendre' : 'Réactiver'}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(
            () => supprimerCentre(centreId),
            'Centre supprimé.',
            (msg) =>
              msg === 'CENTRE_NON_VIDE'
                ? 'Impossible : des jeunes ou agents sont rattachés. Suspendez-le plutôt.'
                : 'Suppression impossible.',
            'Supprimer définitivement ce centre ? Action irréversible.',
          )
        }
        style={{ ...btn, background: 'var(--gj-surface)', color: 'var(--gj-red-ink)', border: '1.5px solid var(--gj-red)', opacity: pending ? 0.6 : 1 }}
      >
        <Icon name="close" size={14} /> Supprimer
      </button>

      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </>
  )
}
