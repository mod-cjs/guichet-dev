'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Chip'
import { Pagination } from '@/components/ui/Pagination'
import { Toast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { raisonLabel, dangerLabel } from '@/lib/ia/admin/escalade-labels'
import type { CanalAgent, StatutEscalade } from '@prisma/client'

// ─── Types (sérialisables) ──────────────────────────────────────────────────

export interface EscaladeRowDTO {
  id: string
  sessionId: string
  cjsUid: string | null
  centreId: string | null
  /** Nom du centre résolu (jamais le cuid brut) — « — » si centre inconnu, null si aucun centre. */
  centreNom: string | null
  canal: CanalAgent
  raison: string | null
  stade: string | null
  signalDanger: string | null
  /** 0 = normal, 1 = danger (fait aussi remonter en haut de file). */
  priorite: number
  statut: StatutEscalade
  traitePar: string | null
  traiteA: string | null
  createdAt: string
  /** GUIC-259 — échéance de traitement (ISO), dérivée du SLA de la priorité. */
  echeanceSla: string
  /** GUIC-259 — échéance de traitement dépassée (dérivée du SLA de la priorité). */
  enRetardSla: boolean
  /** GUIC-259 — note de clôture saisie à la résolution (facultative). Optionnel côté type pour compat ascendante. */
  resolutionNote?: string | null
  user: { prenom: string; nom: string; telephone: string | null } | null
}

export interface ApercuTurn {
  index: number
  userText: string | null
  assistantText: string | null
  toolsUsed: string[]
  escalade: boolean
}

export interface EscaladesClientProps {
  rows: EscaladeRowDTO[]
  counts: Record<StatutEscalade, number>
  total: number
  currentPage: number
  totalPages: number
  centres: { id: string; nom: string }[]
  staff: { cjsUid: string; nom: string }[]
  currentUid: string
  filtres: { statut: string; canal: string; centre: string; danger: boolean; retard: boolean; q: string; from: string; to: string }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUT_META: Record<StatutEscalade, { label: string; bg: string; fg: string }> = {
  en_attente:      { label: 'En attente',     bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
  prise_en_charge: { label: 'Prise en charge', bg: 'var(--gj-blue-soft)',   fg: 'var(--gj-blue-ink)' },
  resolue:         { label: 'Résolue',          bg: 'var(--gj-green-soft)',  fg: 'var(--gj-green-ink)' },
}

const STATUT_ORDER: StatutEscalade[] = ['en_attente', 'prise_en_charge', 'resolue']

function relative(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return `il y a ${d} j`
}

function canalLabel(c: CanalAgent): string {
  return c === 'whatsapp' ? 'WhatsApp' : 'Web'
}

/** Durée lisible (min → h → j) à partir d'un nombre de minutes positif. */
function dureeCourte(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} h`
  return `${Math.floor(h / 24)} j`
}

/** Échéance SLA relative : « dans X » si à venir, « dépassée de X » si passée. */
function echeanceLabel(iso: string): { texte: string; depasse: boolean } {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  return diffMin >= 0
    ? { texte: `dans ${dureeCourte(diffMin)}`, depasse: false }
    : { texte: `dépassée de ${dureeCourte(-diffMin)}`, depasse: true }
}

/** Nom affichable du bénéficiaire (fallback cjs_uid court, puis « Anonyme »). */
function userLabel(row: EscaladeRowDTO): string {
  if (row.user) return `${row.user.prenom} ${row.user.nom}`.trim() || 'Bénéficiaire'
  if (row.cjsUid) return `${row.cjsUid.slice(0, 8)}…`
  return 'Anonyme'
}

const GRID = '1.3fr 1.6fr 1fr 1fr 1.4fr'

const dateInputStyle: React.CSSProperties = {
  background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 8,
  padding: '0 8px', minHeight: 40, fontSize: 12.5, fontFamily: 'inherit', color: 'var(--gj-ink)', cursor: 'pointer',
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function EscaladesClient({ rows, counts, total, currentPage, totalPages, centres, staff, currentUid, filtres }: EscaladesClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)
  /** GUIC-259 — escalade en cours de clôture (ouvre le modal de note). */
  const [clotureId, setClotureId] = useState<string | null>(null)
  const [noteCloture, setNoteCloture] = useState('')
  /** Escalade en cours de réouverture (confirmation avant action semi-destructive). */
  const [reouvertureId, setReouvertureId] = useState<string | null>(null)
  const [recherche, setRecherche] = useState(filtres.q)
  /** Sélection pour action groupée (#12) — uniquement des escalades « en attente ». */
  const [selection, setSelection] = useState<Set<string>>(new Set())
  /** Aperçu de conversation inline (#13) : id de ligne déplié + données chargées. */
  const [apercuId, setApercuId] = useState<string | null>(null)
  const [apercu, setApercu] = useState<{ hasVerbatimText: boolean; turns: ApercuTurn[] } | null>(null)
  const [apercuLoading, setApercuLoading] = useState(false)
  /** Tick pour rafraîchir les temps relatifs / échéances sans recharger. */
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  /** Construit une URL de filtres depuis un état fusionné (partagé push + pagination). */
  function urlFor(merged: typeof filtres): string {
    const sp = new URLSearchParams()
    if (merged.statut) sp.set('statut', merged.statut)
    if (merged.canal && merged.canal !== 'tous') sp.set('canal', merged.canal)
    if (merged.centre) sp.set('centre', merged.centre)
    if (merged.danger) sp.set('danger', '1')
    if (merged.retard) sp.set('retard', '1')
    if (merged.q) sp.set('q', merged.q)
    if (merged.from) sp.set('from', merged.from)
    if (merged.to) sp.set('to', merged.to)
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function push(next: Partial<typeof filtres>) {
    startTransition(() => router.push(urlFor({ ...filtres, ...next })))
  }

  async function changeStatut(id: string, statut: StatutEscalade, expectedFrom: StatutEscalade, resolutionNote?: string) {
    setBusy(id)
    setErreur(null)
    try {
      const body: { statut: StatutEscalade; expectedFrom: StatutEscalade; resolutionNote?: string } = { statut, expectedFrom }
      if (statut === 'resolue' && resolutionNote !== undefined) body.resolutionNote = resolutionNote
      const res = await fetch(`/api/admin/yaye/escalades/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const msg = statut === 'resolue' ? 'Escalade résolue.' : statut === 'prise_en_charge' ? 'Escalade prise en charge.' : 'Escalade rouverte.'
        setSucces(msg)
        startTransition(() => router.refresh())
      } else if (res.status === 409) {
        setErreur('Cette escalade a changé entre-temps — la file va se rafraîchir.')
        startTransition(() => router.refresh())
      } else {
        setErreur("Action impossible — l'escalade n'a pas été mise à jour.")
      }
    } catch {
      setErreur("Action impossible — l'escalade n'a pas été mise à jour.")
    } finally {
      setBusy(null)
    }
  }

  /** GUIC-259 — ouvre le modal de note de clôture avant résolution. */
  function ouvrirCloture(id: string) {
    setNoteCloture('')
    setClotureId(id)
  }

  async function confirmerCloture() {
    if (!clotureId) return
    // On garde le modal ouvert pendant le PATCH (bouton en loading), puis on ferme.
    await changeStatut(clotureId, 'resolue', 'prise_en_charge', noteCloture)
    setClotureId(null)
  }

  async function confirmerReouverture() {
    if (!reouvertureId) return
    await changeStatut(reouvertureId, 'en_attente', 'resolue')
    setReouvertureId(null)
  }

  function lancerRecherche() {
    push({ q: recherche.trim() })
  }

  /** Ouvre/ferme l'aperçu inline d'une session ; charge à la demande (#13). */
  async function toggleApercu(id: string, sessionId: string) {
    if (apercuId === id) { setApercuId(null); setApercu(null); return }
    setApercuId(id); setApercu(null); setApercuLoading(true)
    try {
      const res = await fetch(`/api/admin/yaye/sessions/${encodeURIComponent(sessionId)}/apercu`)
      const json = await res.json()
      if (res.ok && json.data) setApercu(json.data)
      else setErreur('Aperçu indisponible.')
    } catch {
      setErreur('Aperçu indisponible.')
    } finally {
      setApercuLoading(false)
    }
  }

  const idsEnAttente = rows.filter((r) => r.statut === 'en_attente').map((r) => r.id)
  const toutSelectionne = idsEnAttente.length > 0 && idsEnAttente.every((id) => selection.has(id))

  function toggleSel(id: string) {
    setSelection((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function toggleTout() {
    setSelection(toutSelectionne ? new Set() : new Set(idsEnAttente))
  }

  /** Prend en charge en LOT les escalades sélectionnées (en attente uniquement). */
  async function prendreEnChargeLot() {
    const ids = [...selection]
    setBusy('__lot__')
    setErreur(null)
    let ok = 0, conflits = 0
    for (const id of ids) {
      try {
        const res = await fetch(`/api/admin/yaye/escalades/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut: 'prise_en_charge', expectedFrom: 'en_attente' }),
        })
        if (res.ok) ok++
        else if (res.status === 409) conflits++
      } catch { /* compté comme échec ci-dessous */ }
    }
    setBusy(null)
    setSelection(new Set())
    if (ok > 0) setSucces(`${ok} escalade${ok > 1 ? 's' : ''} prise${ok > 1 ? 's' : ''} en charge${conflits ? ` · ${conflits} déjà modifiée(s)` : ''}.`)
    else if (conflits) setErreur(`${conflits} escalade(s) avaient déjà changé — file rafraîchie.`)
    else setErreur('Action groupée impossible.')
    startTransition(() => router.refresh())
  }

  const nomStaff = new Map(staff.map((s) => [s.cjsUid, s.nom]))

  /** Réassigne une escalade à un membre du staff (ou à soi). */
  async function reassigner(id: string, assignTo: string, expectedFrom: StatutEscalade) {
    setBusy(id)
    setErreur(null)
    try {
      const res = await fetch(`/api/admin/yaye/escalades/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'prise_en_charge', assignTo, expectedFrom }),
      })
      if (res.ok) {
        setSucces(assignTo === currentUid ? 'Escalade assignée à toi.' : `Escalade réassignée à ${nomStaff.get(assignTo) ?? assignTo}.`)
        startTransition(() => router.refresh())
      } else if (res.status === 409) {
        setErreur('Cette escalade a changé entre-temps — la file va se rafraîchir.')
        startTransition(() => router.refresh())
      } else {
        setErreur('Réassignation impossible.')
      }
    } catch {
      setErreur('Réassignation impossible.')
    } finally {
      setBusy(null)
    }
  }

  const paginationBase = urlFor(filtres)

  const totalAll = STATUT_ORDER.reduce((a, s) => a + counts[s], 0)

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        {/* ── En-tête ── */}
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>Escalades Yaye</h1>
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>
            Conversations passées la main à un conseiller humain ·{' '}
            <span style={{ fontWeight: 800, color: 'var(--gj-yellow-ink)' }}>{counts.en_attente} en attente</span>
          </p>
        </div>

        {/* ── Recherche + dates + rafraîchir ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 240px', minWidth: 200, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 10px', minHeight: 44 }}>
            <Icon name="search" size={15} style={{ color: 'var(--gj-grey)', flexShrink: 0 }} />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') lancerRecherche() }}
              placeholder="Rechercher (nom, téléphone, session)…"
              aria-label="Rechercher une escalade"
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--gj-ink)' }}
            />
            {filtres.q && (
              <button type="button" onClick={() => { setRecherche(''); push({ q: '' }) }} aria-label="Effacer la recherche" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gj-grey)', display: 'inline-flex' }}>
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--gj-grey)' }}>
            Du
            <input type="date" value={filtres.from} max={filtres.to || undefined} onChange={(e) => push({ from: e.target.value })} aria-label="Date de début" style={dateInputStyle} />
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--gj-grey)' }}>
            au
            <input type="date" value={filtres.to} min={filtres.from || undefined} onChange={(e) => push({ to: e.target.value })} aria-label="Date de fin" style={dateInputStyle} />
          </label>
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            aria-label="Rafraîchir la file"
            title="Rafraîchir"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 800, color: 'var(--gj-teal-deep)', background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 12px', minHeight: 44, cursor: 'pointer' }}
          >
            <Icon name="bolt" size={14} /> Rafraîchir
          </button>
        </div>

        {/* ── Chips statut ── */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          <Chip selected={filtres.statut === ''} aria-pressed={filtres.statut === ''} onClick={() => push({ statut: '' })}>
            Toutes ({totalAll})
          </Chip>
          {STATUT_ORDER.map((s) => (
            <Chip key={s} selected={filtres.statut === s} aria-pressed={filtres.statut === s} onClick={() => push({ statut: filtres.statut === s ? '' : s })}>
              {STATUT_META[s].label} ({counts[s]})
            </Chip>
          ))}
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--gj-line)', margin: '0 4px' }} aria-hidden />
          <Chip selected={filtres.danger} aria-pressed={filtres.danger} icon="alert" onClick={() => push({ danger: !filtres.danger })}>Danger</Chip>
          <Chip selected={filtres.retard} aria-pressed={filtres.retard} icon="clock" onClick={() => push({ retard: !filtres.retard })}>En retard</Chip>
          <Chip selected={filtres.canal === 'web'} aria-pressed={filtres.canal === 'web'} icon="desktop" onClick={() => push({ canal: filtres.canal === 'web' ? 'tous' : 'web' })}>Web</Chip>
          <Chip selected={filtres.canal === 'whatsapp'} aria-pressed={filtres.canal === 'whatsapp'} icon="whatsapp" onClick={() => push({ canal: filtres.canal === 'whatsapp' ? 'tous' : 'whatsapp' })}>WhatsApp</Chip>
          <select
            value={filtres.centre}
            onChange={(e) => push({ centre: e.target.value })}
            aria-label="Filtrer par centre"
            style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 10px', minHeight: 44, fontSize: 13, fontFamily: 'inherit', color: 'var(--gj-ink)', cursor: 'pointer' }}
          >
            <option value="">Tous centres</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>

        {/* ── Barre d'action groupée (#12) ── */}
        {selection.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--gj-teal-soft, var(--gj-bg))', border: '1.5px solid var(--gj-teal)' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--gj-ink)' }}>{selection.size} sélectionnée{selection.size > 1 ? 's' : ''}</span>
            <button
              type="button"
              onClick={prendreEnChargeLot}
              disabled={busy === '__lot__'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 800, minHeight: 40, padding: '7px 14px', borderRadius: 9, cursor: busy === '__lot__' ? 'progress' : 'pointer', background: 'var(--gj-teal)', color: 'var(--gj-surface)', border: 'none', opacity: busy === '__lot__' ? 0.6 : 1 }}
            >
              <Icon name="check" size={13} /> {busy === '__lot__' ? 'En cours…' : 'Prendre en charge la sélection'}
            </button>
            <button type="button" onClick={() => setSelection(new Set())} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gj-grey)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Annuler</button>
          </div>
        )}

        {/* ── Table ── */}
        <div
          data-testid="escalades-table"
          aria-busy={isPending}
          style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, overflow: 'hidden', opacity: isPending ? 0.6 : 1, transition: 'opacity .15s ease' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 18px', borderBottom: '1.5px solid var(--gj-line)', background: 'var(--gj-bg)', fontSize: 11.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }} className="hidden md:grid">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" aria-label="Tout sélectionner" checked={toutSelectionne} onChange={toggleTout} disabled={idsEnAttente.length === 0} style={{ cursor: idsEnAttente.length ? 'pointer' : 'default' }} />
              Utilisateur
            </span>
            <span>Raison / stade</span>
            <span>Signalée</span>
            <span>Statut</span>
            <span>Action</span>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>
              Aucune escalade {filtres.statut ? `« ${STATUT_META[filtres.statut as StatutEscalade]?.label} »` : ''}.
            </div>
          ) : (
            rows.map((e) => {
              const sm = STATUT_META[e.statut]
              return (
                <div key={e.id}>
                <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 18px', borderBottom: apercuId === e.id ? 'none' : '1px solid var(--gj-line)', alignItems: 'center' }} className="!grid grid-cols-1 md:!grid-cols-[1.3fr_1.6fr_1fr_1fr_1.4fr]">
                  {/* Utilisateur + contact (essentiel sur un signalement de danger) */}
                  <div style={{ minWidth: 0, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {e.statut === 'en_attente' && (
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner l'escalade de ${userLabel(e)}`}
                        checked={selection.has(e.id)}
                        onChange={() => toggleSel(e.id)}
                        style={{ marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gj-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userLabel(e)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gj-grey)' }}>
                      {canalLabel(e.canal)}{e.centreNom ? ` · ${e.centreNom}` : ''}
                    </div>
                    {e.cjsUid && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                        <Link href={`/admin/utilisateurs/${e.cjsUid}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--gj-teal-deep)', textDecoration: 'none' }}>
                          <Icon name="user" size={11} /> Fiche
                        </Link>
                        {e.user?.telephone && (
                          <a href={`tel:${e.user.telephone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--gj-teal-deep)', textDecoration: 'none' }}>
                            <Icon name="phone" size={11} /> {e.user.telephone}
                          </a>
                        )}
                      </div>
                    )}
                    </div>
                  </div>

                  {/* Raison / stade (+ badge DANGER prioritaire) */}
                  <div style={{ minWidth: 0 }}>
                    {e.signalDanger && (
                      <span
                        style={{
                          display: 'inline-block', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '.4px', color: 'var(--gj-surface)', background: 'var(--gj-red)',
                          borderRadius: 999, padding: '1px 8px', marginBottom: 3,
                        }}
                      >
                        Danger · {dangerLabel(e.signalDanger)}
                      </span>
                    )}
                    {e.enRetardSla && e.statut !== 'resolue' && (
                      <span
                        title="Délai de traitement (SLA) dépassé pour cette priorité"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '.3px', color: 'var(--gj-red-ink)',
                          background: 'var(--gj-red-soft)', borderRadius: 999, padding: '1px 8px', marginBottom: 3, marginLeft: e.signalDanger ? 6 : 0,
                        }}
                      >
                        <Icon name="clock" size={11} /> SLA dépassé
                      </span>
                    )}
                    <span
                      title="Priorité de traitement (0 = normale)"
                      style={{
                        display: 'inline-block', fontSize: 11.5, fontWeight: 800,
                        color: e.priorite > 0 ? 'var(--gj-red-ink)' : 'var(--gj-grey)',
                        background: e.priorite > 0 ? 'var(--gj-red-soft)' : 'var(--gj-bg)',
                        borderRadius: 999, padding: '1px 8px', marginBottom: 3, marginRight: 4,
                      }}
                    >
                      Priorité {e.priorite}
                    </span>
                    <div title={raisonLabel(e.raison)} style={{ fontSize: 12.5, color: 'var(--gj-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{raisonLabel(e.raison)}</div>
                    {e.stade && <div title={e.stade} style={{ fontSize: 11, color: 'var(--gj-grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.stade}</div>}
                    {e.statut === 'resolue' && e.resolutionNote && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 11.5, color: 'var(--gj-green-ink)', marginTop: 3 }}>
                        <Icon name="check-circle" size={11} />
                        <span>Clôture : {e.resolutionNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Signalée + échéance SLA (triage par urgence) */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--gj-grey)' }}>{relative(e.createdAt)}</div>
                    {e.statut !== 'resolue' && (() => {
                      const ech = echeanceLabel(e.echeanceSla)
                      return (
                        <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, color: ech.depasse ? 'var(--gj-red-ink)' : 'var(--gj-grey)' }}>
                          Échéance {ech.texte}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Statut + qui traite / depuis quand (suivi SLA) */}
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: sm.bg, color: sm.fg, whiteSpace: 'nowrap' }}>{sm.label}</span>
                    {e.statut !== 'en_attente' && e.traitePar && (
                      <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        par {nomStaff.get(e.traitePar) ?? `${e.traitePar.slice(0, 8)}…`}{e.traiteA ? ` · ${relative(e.traiteA)}` : ''}
                      </div>
                    )}
                    {e.statut === 'en_attente' && e.signalDanger && (
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gj-red-ink)', marginTop: 4 }}>
                        en attente {relative(e.createdAt)}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {e.statut === 'en_attente' && (
                      <ActionBtn busy={busy === e.id} onClick={() => changeStatut(e.id, 'prise_en_charge', 'en_attente')} icon="check" label="Prendre en charge" />
                    )}
                    {e.statut === 'prise_en_charge' && (
                      <ActionBtn busy={busy === e.id} onClick={() => ouvrirCloture(e.id)} icon="check-circle" label="Marquer résolue" tone="green" />
                    )}
                    {e.statut === 'prise_en_charge' && staff.length > 0 && (
                      <select
                        aria-label="Réassigner à"
                        value=""
                        disabled={busy === e.id}
                        onChange={(ev) => { if (ev.target.value) reassigner(e.id, ev.target.value, 'prise_en_charge') }}
                        style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 9, padding: '0 8px', minHeight: 44, fontSize: 12, fontFamily: 'inherit', color: 'var(--gj-ink)', cursor: 'pointer', maxWidth: 130 }}
                      >
                        <option value="">Réassigner…</option>
                        {e.traitePar !== currentUid && <option value={currentUid}>M&apos;assigner</option>}
                        {staff.filter((s) => s.cjsUid !== e.traitePar).map((s) => (
                          <option key={s.cjsUid} value={s.cjsUid}>{s.nom}</option>
                        ))}
                      </select>
                    )}
                    {e.statut === 'resolue' && (
                      <ActionBtn busy={busy === e.id} onClick={() => setReouvertureId(e.id)} icon="arrow-up" label="Rouvrir" tone="muted" />
                    )}
                    <button
                      type="button"
                      onClick={() => toggleApercu(e.id, e.sessionId)}
                      aria-expanded={apercuId === e.id}
                      title="Aperçu de la conversation"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: 'var(--gj-teal-deep)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 8px' }}
                    >
                      <Icon name={apercuId === e.id ? 'chevron-down' : 'chevron-right'} size={13} />
                      Aperçu
                    </button>
                    <Link href={`/admin/yaye/sessions/${e.sessionId}`} title="Voir la session" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: 'var(--gj-teal-deep)', textDecoration: 'none', padding: '6px 8px' }}>
                      <Icon name="external" size={13} />
                      Session
                    </Link>
                  </div>
                </div>
                {apercuId === e.id && (
                  <div data-testid="apercu-panel" style={{ padding: '12px 18px 16px', borderBottom: '1px solid var(--gj-line)', background: 'var(--gj-bg)' }}>
                    {apercuLoading ? (
                      <span style={{ fontSize: 12.5, color: 'var(--gj-grey)' }}>Chargement de l&apos;aperçu…</span>
                    ) : !apercu || apercu.turns.length === 0 ? (
                      <span style={{ fontSize: 12.5, color: 'var(--gj-grey)' }}>Aucun tour à afficher.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {!apercu.hasVerbatimText && (
                          <span style={{ fontSize: 11, color: 'var(--gj-grey)', fontStyle: 'italic' }}>
                            Canal web : le texte n&apos;est pas conservé — aperçu structurel (outils appelés).
                          </span>
                        )}
                        {apercu.turns.map((t) => (
                          <div key={t.index} style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 8, borderLeft: `2px solid ${t.escalade ? 'var(--gj-red)' : 'var(--gj-line)'}` }}>
                            {t.userText && <div style={{ fontSize: 12.5, color: 'var(--gj-ink)' }}><b>Usager :</b> {t.userText}</div>}
                            {t.assistantText && <div style={{ fontSize: 12.5, color: 'var(--gj-teal-deep)' }}><b>Yaye :</b> {t.assistantText}</div>}
                            {(t.toolsUsed.length > 0 || (!t.userText && !t.assistantText)) && (
                              <div style={{ fontSize: 11, color: 'var(--gj-grey)' }}>
                                Tour {t.index + 1}{t.toolsUsed.length ? ` · ${t.toolsUsed.join(', ')}` : ''}{t.escalade ? ' · escalade' : ''}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                </div>
              )
            })
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={paginationBase} ariaLabel="Pagination des escalades" />
          </div>
        )}

        <p style={{ marginTop: 16, fontSize: 11.5, color: 'var(--gj-grey)', textAlign: 'center' }}>
          {total} escalade{total > 1 ? 's' : ''} · le staff du centre est notifié à chaque escalade
        </p>
      </div>

      {erreur && <Toast message={erreur} variant="danger" onClose={() => setErreur(null)} />}
      {succes && <Toast message={succes} variant="success" onClose={() => setSucces(null)} />}

      <Modal
        isOpen={reouvertureId !== null}
        onClose={() => setReouvertureId(null)}
        title="Rouvrir l'escalade ?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReouvertureId(null)}>Annuler</Button>
            <Button variant="primary" onClick={confirmerReouverture} loading={busy !== null}>Rouvrir</Button>
          </>
        }
      >
        <p style={{ fontSize: 13.5, color: 'var(--gj-ink)' }}>
          L&apos;escalade repassera « en attente » et sera désassignée. La note de clôture est conservée comme historique.
        </p>
      </Modal>

      <Modal
        isOpen={clotureId !== null}
        onClose={() => setClotureId(null)}
        title="Clôturer l'escalade"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClotureId(null)}>Annuler</Button>
            <Button variant="primary" onClick={confirmerCloture} loading={busy !== null}>Confirmer</Button>
          </>
        }
      >
        <Textarea
          id="resolution-note"
          label="Note de clôture — qu'est-ce qui a été fait / la réponse apportée ?"
          value={noteCloture}
          onChange={(e) => setNoteCloture(e.target.value)}
          rows={4}
          placeholder="Facultatif"
        />
      </Modal>
    </div>
  )
}

function ActionBtn({ busy, onClick, icon, label, tone }: { busy: boolean; onClick: () => void; icon: 'check' | 'check-circle' | 'arrow-up'; label: string; tone?: 'green' | 'muted' }) {
  const colors =
    tone === 'green'
      ? { bg: 'var(--gj-green)', fg: 'var(--gj-surface)', border: 'transparent' }
      : tone === 'muted'
        ? { bg: 'var(--gj-surface)', fg: 'var(--gj-grey)', border: 'var(--gj-line)' }
        : { bg: 'var(--gj-teal)', fg: 'var(--gj-surface)', border: 'transparent' }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12, fontWeight: 800,
        padding: '7px 11px', minHeight: 44, borderRadius: 9, cursor: busy ? 'default' : 'pointer',
        background: colors.bg, color: colors.fg, border: `1.5px solid ${colors.border}`,
        opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
      }}
    >
      <Icon name={icon} size={13} />
      {label}
    </button>
  )
}
