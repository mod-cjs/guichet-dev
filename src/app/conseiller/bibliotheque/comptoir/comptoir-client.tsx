'use client'

import { useState, useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { CardScanner } from './card-scanner'
import { identifierParCarte, confirmerRetrait, enregistrerRetour, rechercherLivresPourPret, preterLivre } from '../actions'
import type { JeuneIdentifie, EmpruntBrief, LivrePret } from '../types'

function EmpruntLine({ e, actionLabel, actionIcon, onAction, pending }: {
  e: EmpruntBrief; actionLabel: string; actionIcon: 'check' | 'check-circle'; onAction: () => void; pending: boolean
}) {
  return (
    <div className="flex items-center gap-space-3 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
      <span className="inline-flex items-center justify-center shrink-0 rounded-gj-md" style={{ width: 38, height: 38, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
        <Icon name="learning" size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-space-2">
          <span className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13.5 }}>{e.livreTitre}</span>
          {e.enRetard && <span className="font-extrabold shrink-0" style={{ fontSize: 9.5, background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)', padding: '1px 7px', borderRadius: 999 }}>En retard</span>}
        </div>
        <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5 }}>{e.codeBarre}{e.retourLabel ? ` · retour prévu ${e.retourLabel}` : ''}</div>
      </div>
      <button type="button" onClick={onAction} disabled={pending} className="inline-flex items-center gap-space-1 font-extrabold shrink-0 disabled:opacity-50" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '9px 14px', borderRadius: 9, fontSize: 12.5 }}>
        <Icon name={actionIcon} size={14} /> {actionLabel}
      </button>
    </div>
  )
}

export function ComptoirClient() {
  const [token, setToken] = useState<string | null>(null)
  const [jeune, setJeune] = useState<JeuneIdentifie | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pending, start] = useTransition()
  // Prêt
  const [q, setQ] = useState('')
  const [results, setResults] = useState<LivrePret[]>([])
  const [searching, startSearch] = useTransition()

  const identify = (raw: string) => {
    setError(null); setToast(null)
    start(async () => {
      const res = await identifierParCarte(raw)
      if (res.error) { setError(res.error.message); setJeune(null) }
      else { setToken(raw); setJeune(res.data!); setResults([]); setQ('') }
    })
  }

  const refresh = () => { if (token) identify(token) }

  const doAction = (fn: (id: string) => Promise<{ error?: { message: string } }>, id: string, done: string) => {
    setError(null)
    start(async () => {
      const res = await fn(id)
      if (res.error) setError(res.error.message)
      else { setToast(done); refresh() }
    })
  }

  const search = (value: string) => {
    setQ(value)
    if (value.trim().length < 2) { setResults([]); return }
    startSearch(async () => {
      const res = await rechercherLivresPourPret(value)
      if (!res.error) setResults(res.data ?? [])
    })
  }

  const preter = (exemplaireId: string) => {
    if (!jeune) return
    setError(null)
    start(async () => {
      const res = await preterLivre(exemplaireId, jeune.cjsUid)
      if (res.error) setError(res.error.message)
      else { setToast('Prêt enregistré.'); setResults([]); setQ(''); refresh() }
    })
  }

  const reset = () => { setJeune(null); setToken(null); setError(null); setToast(null); setResults([]); setQ('') }

  // ── Étape 1 : scan carte ──
  if (!jeune) {
    return (
      <div className="bg-white rounded-gj-lg p-space-5 flex flex-col gap-space-3" style={{ border: '1.5px solid var(--gj-line)' }}>
        <div>
          <div className="font-black text-color-text-primary" style={{ fontSize: 16 }}>Scanner la carte du jeune</div>
          <div className="text-color-text-secondary" style={{ fontSize: 12.5 }}>Retrait et dépôt de livres se font en scannant la carte CJS.</div>
        </div>
        <CardScanner onToken={identify} pending={pending} />
        {error && <div className="text-fs-200" style={{ color: 'var(--gj-red)' }}>{error}</div>}
      </div>
    )
  }

  // ── Étape 2 : jeune identifié → actions ──
  return (
    <div className="flex flex-col gap-space-4">
      {/* En-tête jeune */}
      <div className="bg-white rounded-gj-lg p-space-4 flex items-center gap-space-3" style={{ border: '1.5px solid var(--gj-teal-deep)' }}>
        <span className="inline-flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', fontWeight: 900, fontSize: 16 }}>{jeune.initials}</span>
        <div className="flex-1 min-w-0">
          <div className="font-black text-color-text-primary truncate" style={{ fontSize: 16 }}>{jeune.name}</div>
          <div className="text-color-text-secondary" style={{ fontSize: 12 }}>{jeune.aRetirer.length} à retirer · {jeune.aRendre.length} à rendre</div>
        </div>
        <button type="button" onClick={reset} className="inline-flex items-center gap-space-1 font-extrabold shrink-0" style={{ background: '#fff', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-line)', padding: '8px 12px', borderRadius: 9, fontSize: 12.5 }}>
          <Icon name="camera" size={14} /> Autre carte
        </button>
      </div>

      {toast && <div className="rounded-gj-md" style={{ background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)', padding: '10px 12px', fontSize: 12.5, fontWeight: 700 }}>{toast}</div>}
      {error && <div className="rounded-gj-md" style={{ background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)', padding: '10px 12px', fontSize: 12.5, fontWeight: 700 }}>{error}</div>}

      {/* À retirer (réservés en ligne) */}
      <section className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
        <h2 className="font-black text-color-text-primary m-0" style={{ fontSize: 15, marginBottom: 8 }}>À retirer</h2>
        {jeune.aRetirer.length === 0
          ? <p className="text-color-text-secondary m-0" style={{ fontSize: 12.5 }}>Aucune réservation à retirer.</p>
          : jeune.aRetirer.map((e) => <EmpruntLine key={e.id} e={e} actionLabel="Remettre le livre" actionIcon="check" pending={pending} onAction={() => doAction(confirmerRetrait, e.id, 'Retrait confirmé.')} />)}
      </section>

      {/* À rendre */}
      <section className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
        <h2 className="font-black text-color-text-primary m-0" style={{ fontSize: 15, marginBottom: 8 }}>À rendre</h2>
        {jeune.aRendre.length === 0
          ? <p className="text-color-text-secondary m-0" style={{ fontSize: 12.5 }}>Aucun livre en cours.</p>
          : jeune.aRendre.map((e) => <EmpruntLine key={e.id} e={e} actionLabel="Enregistrer le retour" actionIcon="check-circle" pending={pending} onAction={() => doAction(enregistrerRetour, e.id, 'Retour enregistré.')} />)}
      </section>

      {/* Prêter un livre */}
      <section className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
        <h2 className="font-black text-color-text-primary m-0" style={{ fontSize: 15, marginBottom: 8 }}>Prêter un livre</h2>
        <div className="flex items-center gap-space-2" style={{ background: 'var(--gj-bg)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 12px', minHeight: 44 }}>
          <Icon name="search" size={16} style={{ color: 'var(--gj-grey)' }} />
          <input value={q} onChange={(e) => search(e.target.value)} placeholder="Rechercher un livre disponible…" aria-label="Rechercher un livre" className="flex-1 bg-transparent outline-none text-fs-300" style={{ border: 0, color: 'var(--gj-ink)' }} />
        </div>
        {searching && <p className="text-fs-100 text-color-text-secondary" style={{ marginTop: 6 }}>Recherche…</p>}
        {results.length > 0 && (
          <div className="flex flex-col" style={{ marginTop: 8 }}>
            {results.map((l) => (
              <div key={l.exemplaireId} className="flex items-center gap-space-3 py-space-2" style={{ borderBottom: '1px solid var(--gj-line)' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13 }}>{l.titre}</div>
                  <div className="text-color-text-secondary truncate" style={{ fontSize: 11 }}>{l.auteur} · {l.emplacement}</div>
                </div>
                <button type="button" onClick={() => preter(l.exemplaireId)} disabled={pending} className="inline-flex items-center gap-space-1 font-extrabold shrink-0 disabled:opacity-50" style={{ background: 'var(--gj-green)', color: '#fff', border: 0, padding: '8px 14px', borderRadius: 9, fontSize: 12.5 }}>
                  <Icon name="plus" size={14} /> Prêter
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
