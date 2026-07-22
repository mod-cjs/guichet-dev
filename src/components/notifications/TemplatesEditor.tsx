'use client'

// GUIC-553 évolution — Éditeur de templates d'emails (partagé admin / recruteur).
// Cartes v4 : nom + provenance (défaut / système / personnalisé), édition sujet+corps,
// variables cliquables, aperçu rendu avec des données d'exemple.

import { useState, useTransition } from 'react'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import {
  renderTemplate,
  TEMPLATE_VARIABLES,
  type ResolvedTemplate,
} from '@/lib/email/templates-defs'

const APERCU_VARS = {
  prenom: 'Awa',
  nom: 'Diallo',
  offre: 'Chargé(e) de projet agricole',
  organisation: 'AgriCorp Sénégal',
  complement: '',
}

const SOURCE_META: Record<ResolvedTemplate['source'], { label: string; classes: string }> = {
  defaut: { label: 'Défaut', classes: 'bg-gj-bg text-gj-grey' },
  systeme: { label: 'Système', classes: 'bg-gj-blue-soft text-gj-blue-ink' },
  recruteur: { label: 'Personnalisé', classes: 'bg-gj-teal-soft text-gj-teal-deep' },
}

export function TemplatesEditor({
  initial,
  save,
  reset,
  resetHint,
}: {
  initial: ResolvedTemplate[]
  save: (cle: string, sujet: string, corps: string) => Promise<{ ok: true }>
  reset: (cle: string) => Promise<{ ok: true }>
  /** Provenances pour lesquelles « Réinitialiser » est proposé. */
  resetHint: ResolvedTemplate['source'][]
}) {
  const [templates, setTemplates] = useState(initial)
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [sujet, setSujet] = useState('')
  const [corps, setCorps] = useState('')
  const [apercu, setApercu] = useState(false)
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)

  function ouvrir(t: ResolvedTemplate) {
    setOuvert(t.cle)
    setSujet(t.sujet)
    setCorps(t.corps)
    setApercu(false)
  }

  function enregistrer(t: ResolvedTemplate) {
    startTransition(async () => {
      try {
        await save(t.cle, sujet, corps)
        setTemplates((ts) =>
          ts.map((x) => (x.cle === t.cle ? { ...x, sujet, corps, source: resetHint[0] ?? x.source } : x)),
        )
        setToast({ message: 'Template enregistré.', variant: 'success' })
        setOuvert(null)
      } catch {
        setToast({ message: 'Échec de l’enregistrement.', variant: 'danger' })
      }
    })
  }

  function reinitialiser(t: ResolvedTemplate) {
    if (!window.confirm(`Réinitialiser « ${t.nom} » ? Votre version sera supprimée.`)) return
    startTransition(async () => {
      try {
        await reset(t.cle)
        setToast({ message: 'Template réinitialisé — rechargez la page pour voir la version de base.', variant: 'success' })
        setOuvert(null)
      } catch {
        setToast({ message: 'Réinitialisation impossible.', variant: 'danger' })
      }
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      {templates.map((t) => {
        const meta = SOURCE_META[t.source]
        const estOuvert = ouvert === t.cle
        return (
          <div key={t.cle} className="rounded-[14px] border-[1.5px] border-gj-line bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-extrabold text-gj-ink">{t.nom}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.classes}`}>{meta.label}</span>
              <span className="text-[11px] text-gj-grey">{t.cle}</span>
              <button
                type="button"
                onClick={() => (estOuvert ? setOuvert(null) : ouvrir(t))}
                className="ml-auto rounded-[10px] border-[1.5px] border-gj-line bg-white px-3 py-1.5 text-[12px] font-extrabold text-gj-ink"
              >
                {estOuvert ? 'Fermer' : 'Consulter / Modifier'}
              </button>
            </div>
            <p className="mt-1 text-[12px] text-gj-grey">{t.description}</p>

            {estOuvert && (
              <div className="mt-3 border-t-[1.5px] border-gj-line pt-3">
                <label className="block text-[11.5px] font-bold text-gj-grey">
                  Sujet
                  <input
                    value={sujet}
                    onChange={(e) => setSujet(e.target.value)}
                    className="mt-1 w-full rounded-[10px] border-[1.5px] border-gj-line px-3 py-2 text-[13px] text-gj-ink"
                  />
                </label>
                <label className="mt-3 block text-[11.5px] font-bold text-gj-grey">
                  Corps
                  <textarea
                    value={corps}
                    onChange={(e) => setCorps(e.target.value)}
                    rows={9}
                    className="mt-1 w-full rounded-[10px] border-[1.5px] border-gj-line px-3 py-2 font-mono text-[12.5px] text-gj-ink"
                  />
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gj-grey">
                  Variables :
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCorps((c) => `${c}{{${v}}}`)}
                      className="rounded-full bg-gj-bg px-2 py-0.5 font-mono text-[10.5px] font-bold text-gj-teal-deep"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => enregistrer(t)}
                    className="rounded-[10px] bg-gj-teal-deep px-4 py-2 text-[13px] font-extrabold text-white disabled:opacity-60"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setApercu((a) => !a)}
                    className="rounded-[10px] border-[1.5px] border-gj-line bg-white px-4 py-2 text-[13px] font-extrabold text-gj-ink"
                  >
                    {apercu ? 'Masquer l’aperçu' : 'Aperçu'}
                  </button>
                  {resetHint.includes(t.source) && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => reinitialiser(t)}
                      className="rounded-[10px] border-[1.5px] border-gj-line bg-white px-4 py-2 text-[13px] font-extrabold text-gj-red disabled:opacity-60"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>

                {apercu && (
                  <div className="mt-3 rounded-[10px] border-[1.5px] border-dashed border-gj-line-strong bg-gj-bg p-3">
                    <div className="text-[12px] font-extrabold text-gj-ink">{renderTemplate(sujet, APERCU_VARS)}</div>
                    <div className="mt-2 whitespace-pre-wrap text-[12.5px] text-gj-ink">{renderTemplate(corps, APERCU_VARS)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
