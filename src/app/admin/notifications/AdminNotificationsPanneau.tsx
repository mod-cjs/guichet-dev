'use client'

// GUIC-547 évolution — Panneau notifications à 3 onglets (langage design v4) :
// Configuration (matrice, admin) · À valider (admin + conseiller RH) · Historique (admin).

import { useState, useTransition } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { AdminNotificationsMatrix } from './AdminNotificationsMatrix'
import { TemplatesEditor } from '@/components/notifications/TemplatesEditor'
import {
  validerEnvois,
  rejeterEnvois,
  listHistorique,
  enregistrerTemplateSysteme,
  reinitialiserTemplateSysteme,
  type OccurrenceEnAttente,
  type HistoriquePage,
} from './actions'
import type { MatrixCell } from '@/lib/notifications/matrix'
import type { ResolvedTemplate } from '@/lib/email/templates-defs'

type Onglet = 'config' | 'attente' | 'templates' | 'historique'

const CANAL_LABEL: Record<string, string> = {
  in_app: 'App',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
}

const STATUT_META: Record<string, { label: string; classes: string }> = {
  envoyee: { label: 'Envoyée', classes: 'bg-gj-green-soft text-gj-green-ink' },
  en_attente_validation: { label: 'À valider', classes: 'bg-gj-yellow-soft text-gj-yellow-ink' },
  planifiee: { label: 'Planifiée', classes: 'bg-gj-bg text-gj-grey' },
  echec_retry: { label: 'Nouvel essai', classes: 'bg-gj-yellow-soft text-gj-yellow-ink' },
  abandonnee: { label: 'Abandonnée', classes: 'bg-gj-red-soft text-gj-red-ink' },
  rejetee: { label: 'Rejetée', classes: 'bg-gj-red-soft text-gj-red-ink' },
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Onglet À valider ─────────────────────────────────────────────────────────

function EnAttenteList({
  initial,
  onResult,
}: {
  initial: OccurrenceEnAttente[]
  onResult: (message: string, variant: ToastVariant) => void
}) {
  const [occurrences, setOccurrences] = useState(initial)
  const [pending, startTransition] = useTransition()

  function decide(occ: OccurrenceEnAttente, action: 'valider' | 'rejeter') {
    const verb = action === 'valider' ? 'Valider et ENVOYER' : 'Rejeter (rien ne partira)'
    if (!window.confirm(`${verb} « ${occ.titre} » — ${occ.destinataires} destinataire(s), canaux : ${occ.canaux.map((c) => CANAL_LABEL[c] ?? c).join(', ')} ?`)) return
    startTransition(async () => {
      try {
        const res = action === 'valider' ? await validerEnvois(occ.eventId) : await rejeterEnvois(occ.eventId)
        setOccurrences((os) => os.filter((o) => o.eventId !== occ.eventId))
        onResult(
          action === 'valider' ? `${res.lignes} envoi(s) déclenché(s).` : `Occurrence rejetée (${res.lignes} ligne(s)).`,
          'success',
        )
      } catch {
        onResult('Action impossible (déjà traitée ?).', 'danger')
      }
    })
  }

  if (occurrences.length === 0) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-gj-line bg-white p-8 text-center text-[13px] text-gj-grey">
        Aucune notification en attente de validation.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {occurrences.map((occ) => (
        <div key={occ.eventId} className="rounded-[14px] border-[1.5px] border-gj-line bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-extrabold text-gj-ink">{occ.label}</span>
            {occ.rh && <span className="rounded-full bg-gj-blue-soft px-2 py-0.5 text-[10px] font-extrabold text-gj-blue-ink">RH</span>}
            <span className="rounded-full bg-gj-bg px-2 py-0.5 text-[10px] font-extrabold text-gj-grey">
              {occ.destinataires} destinataire{occ.destinataires > 1 ? 's' : ''}
            </span>
            {occ.canaux.map((c) => (
              <span key={c} className="rounded-full bg-gj-teal-soft px-2 py-0.5 text-[10px] font-extrabold text-gj-teal-deep">
                {CANAL_LABEL[c] ?? c}
              </span>
            ))}
            <span className="ml-auto text-[11px] text-gj-grey">{fmtDate(occ.createdAt)}</span>
          </div>
          <div className="mt-2 text-[13px] text-gj-ink">
            <span className="font-bold">{occ.titre}</span> — <span className="text-gj-grey">{occ.contenu}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => decide(occ, 'valider')}
              className="rounded-[10px] bg-gj-teal-deep px-4 py-2 text-[13px] font-extrabold text-white disabled:opacity-60"
            >
              Valider l’envoi
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => decide(occ, 'rejeter')}
              className="rounded-[10px] border-[1.5px] border-gj-line bg-white px-4 py-2 text-[13px] font-extrabold text-gj-red disabled:opacity-60"
            >
              Rejeter
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Onglet Historique ────────────────────────────────────────────────────────

function HistoriqueList({
  initial,
  onResult,
}: {
  initial: HistoriquePage
  onResult: (message: string, variant: ToastVariant) => void
}) {
  const [pageData, setPageData] = useState(initial)
  const [pending, startTransition] = useTransition()

  function goTo(page: number) {
    startTransition(async () => {
      try {
        setPageData(await listHistorique(page))
      } catch {
        onResult('Chargement impossible.', 'danger')
      }
    })
  }

  if (pageData.items.length === 0) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-gj-line bg-white p-8 text-center text-[13px] text-gj-grey">
        Aucun envoi journalisé pour l’instant.
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-[14px] border-[1.5px] border-gj-line bg-white">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead>
            <tr className="border-b-[1.5px] border-gj-line text-left text-[11px] font-extrabold uppercase tracking-wide text-gj-grey">
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Événement</th>
              <th className="px-3 py-2.5">Destinataire</th>
              <th className="px-3 py-2.5">Canal</th>
              <th className="px-3 py-2.5">Statut</th>
            </tr>
          </thead>
          <tbody>
            {pageData.items.map((item) => {
              const meta = STATUT_META[item.statut] ?? { label: item.statut, classes: 'bg-gj-bg text-gj-grey' }
              return (
                <tr key={item.id} className="border-b border-gj-line/60 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 text-gj-grey">{fmtDate(item.envoyeeA ?? item.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gj-ink">{item.label}</div>
                    <div className="text-[11px] text-gj-grey">{item.titre}</div>
                  </td>
                  <td className="px-3 py-2.5 text-gj-ink">{item.destinataire}</td>
                  <td className="px-3 py-2.5 text-gj-grey">{CANAL_LABEL[item.canal] ?? item.canal}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.classes}`}>{meta.label}</span>
                    {item.erreur && <div className="mt-0.5 max-w-[220px] truncate text-[10.5px] text-gj-red" title={item.erreur}>{item.erreur}</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pageData.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-[12px] text-gj-grey">
          <button
            type="button"
            disabled={pending || pageData.page <= 1}
            onClick={() => goTo(pageData.page - 1)}
            className="rounded-[10px] border-[1.5px] border-gj-line bg-white px-3 py-1.5 font-extrabold text-gj-ink disabled:opacity-40"
          >
            ← Précédent
          </button>
          <span>
            Page {pageData.page} / {pageData.totalPages} · {pageData.total} envois
          </span>
          <button
            type="button"
            disabled={pending || pageData.page >= pageData.totalPages}
            onClick={() => goTo(pageData.page + 1)}
            className="rounded-[10px] border-[1.5px] border-gj-line bg-white px-3 py-1.5 font-extrabold text-gj-ink disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Shell à onglets ──────────────────────────────────────────────────────────

export function AdminNotificationsPanneau({
  adminAccess,
  matrix,
  enAttente,
  historique,
  templates,
}: {
  adminAccess: boolean
  matrix: MatrixCell[]
  enAttente: OccurrenceEnAttente[]
  historique: HistoriquePage
  templates: ResolvedTemplate[]
}) {
  const [onglet, setOnglet] = useState<Onglet>(adminAccess ? 'config' : 'attente')
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const onResult = (message: string, variant: ToastVariant) => setToast({ message, variant })

  const items = [
    ...(adminAccess ? [{ value: 'config' as const, label: 'Configuration' }] : []),
    { value: 'attente' as const, label: 'À valider', count: enAttente.length || undefined },
    ...(adminAccess ? [{ value: 'templates' as const, label: 'Templates' }] : []),
    ...(adminAccess ? [{ value: 'historique' as const, label: 'Historique' }] : []),
  ]

  return (
    <div>
      <Tabs value={onglet} onChange={setOnglet} items={items} ariaLabel="Sections du centre de notifications" className="mb-5" />
      {onglet === 'config' && adminAccess && <AdminNotificationsMatrix initial={matrix} />}
      {onglet === 'attente' && <EnAttenteList initial={enAttente} onResult={onResult} />}
      {onglet === 'templates' && adminAccess && (
        <TemplatesEditor
          initial={templates}
          save={enregistrerTemplateSysteme}
          reset={reinitialiserTemplateSysteme}
          resetHint={['systeme']}
        />
      )}
      {onglet === 'historique' && adminAccess && <HistoriqueList initial={historique} onResult={onResult} />}
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
