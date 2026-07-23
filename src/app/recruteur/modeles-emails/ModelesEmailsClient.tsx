'use client'

// Espace « Modèles d'emails » du recruteur : édition des templates du pipeline
// + historique de SES envois avec leur état (GUIC-553 évolution).

import { useState, useTransition } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { TemplatesEditor } from '@/components/notifications/TemplatesEditor'
import type { ResolvedTemplate } from '@/lib/email/templates-defs'
import {
  enregistrerMonTemplate,
  reinitialiserMonTemplate,
  listMesEnvois,
  type EnvoisRecruteurPage,
} from './actions'

type Onglet = 'modeles' | 'envois'

const STATUT_META: Record<string, { label: string; classes: string }> = {
  envoyee: { label: 'Envoyé', classes: 'bg-gj-green-soft text-gj-green-ink' },
  abandonnee: { label: 'Échec', classes: 'bg-gj-red-soft text-gj-red-ink' },
  echec_retry: { label: 'Nouvel essai', classes: 'bg-gj-yellow-soft text-gj-yellow-ink' },
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function EnvoisList({ initial }: { initial: EnvoisRecruteurPage }) {
  const [pageData, setPageData] = useState(initial)
  const [pending, startTransition] = useTransition()

  function goTo(page: number) {
    startTransition(async () => {
      try {
        setPageData(await listMesEnvois(page))
      } catch { /* noop */ }
    })
  }

  if (pageData.items.length === 0) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-gj-line bg-white p-8 text-center text-[13px] text-gj-grey">
        Aucun email envoyé pour l’instant — sélectionnez des candidatures dans le kanban puis « Email ».
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-[14px] border-[1.5px] border-gj-line bg-white">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead>
            <tr className="border-b-[1.5px] border-gj-line text-left text-[11px] font-extrabold uppercase tracking-wide text-gj-grey">
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Modèle</th>
              <th className="px-3 py-2.5">Candidat</th>
              <th className="px-3 py-2.5">État</th>
            </tr>
          </thead>
          <tbody>
            {pageData.items.map((item) => {
              const meta = STATUT_META[item.statut] ?? { label: item.statut, classes: 'bg-gj-bg text-gj-grey' }
              return (
                <tr key={item.id} className="border-b border-gj-line/60 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 text-gj-grey">{fmtDate(item.envoyeeA ?? item.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gj-ink">{item.template}</div>
                    <div className="text-[11px] text-gj-grey">{item.titre}</div>
                  </td>
                  <td className="px-3 py-2.5 text-gj-ink">{item.destinataire}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.classes}`}>{meta.label}</span>
                    {item.erreur && <div className="mt-0.5 max-w-[200px] truncate text-[10.5px] text-gj-red" title={item.erreur}>{item.erreur}</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pageData.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-[12px] text-gj-grey">
          <button type="button" disabled={pending || pageData.page <= 1} onClick={() => goTo(pageData.page - 1)} className="rounded-[10px] border-[1.5px] border-gj-line bg-white px-3 py-1.5 font-extrabold text-gj-ink disabled:opacity-40">← Précédent</button>
          <span>Page {pageData.page} / {pageData.totalPages} · {pageData.total} envois</span>
          <button type="button" disabled={pending || pageData.page >= pageData.totalPages} onClick={() => goTo(pageData.page + 1)} className="rounded-[10px] border-[1.5px] border-gj-line bg-white px-3 py-1.5 font-extrabold text-gj-ink disabled:opacity-40">Suivant →</button>
        </div>
      )}
    </div>
  )
}

export function ModelesEmailsClient({
  initial,
  envois,
}: {
  initial: ResolvedTemplate[]
  envois: EnvoisRecruteurPage
}) {
  const [onglet, setOnglet] = useState<Onglet>('modeles')

  return (
    <div>
      <Tabs
        value={onglet}
        onChange={setOnglet}
        items={[
          { value: 'modeles', label: 'Modèles' },
          { value: 'envois', label: 'Historique des envois', count: envois.total || undefined },
        ]}
        ariaLabel="Sections des modèles d’emails"
        className="mb-5"
      />
      {onglet === 'modeles' && (
        <TemplatesEditor
          initial={initial}
          save={enregistrerMonTemplate}
          reset={reinitialiserMonTemplate}
          resetHint={['recruteur']}
        />
      )}
      {onglet === 'envois' && <EnvoisList initial={envois} />}
    </div>
  )
}
