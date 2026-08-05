'use client'

import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { StatutCandidature, StatutPipeline } from '@prisma/client'
export type { CandidatureDetail } from '@/lib/loaders/candidature-detail'
import type { CandidatureDetail, DetailMessage } from '@/lib/loaders/candidature-detail'

const STATUT_LABEL: Record<string, string> = { En_attente: 'En attente', Vue: 'Vue', Retenue: 'Retenue', Refusee: 'Refusée' }
const STATUT_COLORS: Record<string, { bg: string; fg: string }> = {
  Retenue: { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' },
  Refusee: { bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
  Vue: { bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' },
  En_attente: { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
}
const PIPE: { value: StatutPipeline; label: string }[] = [
  { value: 'Recue', label: 'Reçue' }, { value: 'Preselection', label: 'Présélection' },
  { value: 'Entretien', label: 'Entretien' }, { value: 'Decision', label: 'Décision' },
]
const ENT_STATUT: Record<string, string> = { Planifie: 'Planifié', Annule: 'Annulé', Termine: 'Terminé' }
function scoreColor(s: number): string { return s >= 75 ? 'var(--gj-green-ink)' : s >= 50 ? 'var(--gj-admin-gold)' : 'var(--gj-red-ink)' }

const H6: CSSProperties = { margin: '0 0 12px', paddingBottom: 9, borderBottom: '1px solid var(--gj-line)', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)', display: 'flex', alignItems: 'center', gap: 9 }
const TICK: CSSProperties = { width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flex: 'none' }
const KV: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px 16px', background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '14px 15px' }
const KVI: CSSProperties = { display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gj-grey)', marginBottom: 4 }
const FOOTBTN: CSSProperties = { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 12px', borderRadius: 9, fontSize: 12.5, fontWeight: 800, border: '1px solid var(--gj-line-strong)', background: 'transparent', color: 'var(--gj-ink)', cursor: 'pointer' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h6 style={H6}><span aria-hidden style={TICK} />{title}</h6>{children}</div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 13, color: 'var(--gj-ink)', fontWeight: 600 }}><i style={KVI}>{label}</i>{children}</span>
}

/**
 * Fiche candidature en SLIDE-OVER (lecture seule, GUIC-692 PR-B). Supervision : aucune
 * décision (Retenir/Refuser = recruteur). Relance/export = actions PR-C (branchées via props).
 */
export function CandidatureDetailPanel({ detail, onClose, onRelancer, onExporter }: {
  detail: CandidatureDetail
  onClose: () => void
  onRelancer?: (d: CandidatureDetail) => void
  onExporter?: (d: CandidatureDetail) => void
}) {
  const [showLettre, setShowLettre] = useState(false)
  const sc = STATUT_COLORS[detail.statut] ?? STATUT_COLORS.En_attente
  const ci = PIPE.findIndex((p) => p.value === detail.etape)

  function scrollToConv() {
    document.getElementById('cand-conversation')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,12,10,.6)', backdropFilter: 'blur(4px)', zIndex: 100 }} />
      <aside role="dialog" aria-label={`Fiche candidature de ${detail.candidatPrenom} ${detail.candidatNom}`} style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(560px, 96vw)', background: 'var(--gj-bg)', borderLeft: '1px solid var(--gj-line-strong)', boxShadow: '-24px 0 70px rgba(0,0,0,.4)', zIndex: 101, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ position: 'relative', padding: '18px 20px 15px', borderBottom: '1px solid var(--gj-line)', background: 'var(--gj-surface)' }}>
          <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, height: 3, width: '100%', background: 'var(--gj-admin-gold)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.fg }}>{STATUT_LABEL[detail.statut] ?? detail.statut}</span>
            <span className="num" style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: detail.score == null ? 'var(--gj-line)' : 'var(--gj-admin-gold)', color: detail.score == null ? 'var(--gj-grey)' : 'var(--gj-admin-on-gold)' }}>Score {detail.score == null ? '—' : detail.score}</span>
            {detail.score != null && <span />}
            <button type="button" onClick={onClose} aria-label="Fermer" style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 9, border: '1px solid var(--gj-line)', background: 'var(--gj-bg)', color: 'var(--gj-grey)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="close" size={16} /></button>
          </div>
          <h3 style={{ margin: 0, fontSize: 18.5, fontWeight: 900, lineHeight: 1.25, color: 'var(--gj-ink)' }}>{detail.candidatPrenom} {detail.candidatNom} → {detail.opportuniteTitre}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 14px', marginTop: 10, fontSize: 12, color: 'var(--gj-grey)' }}>
            <span className="num" style={{ fontFamily: 'ui-monospace, monospace' }}>cjs_uid {detail.candidatCjsUid}</span>
            <span>Soumise {detail.soumiseLe}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 19 }}>
          <Section title="Étape (pipeline recruteur)">
            <div style={{ display: 'flex', gap: 8 }}>
              {PIPE.map((p, i) => {
                const done = i < ci, cur = i === ci
                return (
                  <div key={p.value} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: 26, height: 26, margin: '0 auto 5px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, background: done ? 'var(--gj-green-soft)' : cur ? 'var(--gj-admin-gold)' : 'var(--gj-line)', color: done ? 'var(--gj-green-ink)' : cur ? 'var(--gj-admin-on-gold)' : 'var(--gj-grey)' }}>{done ? '✓' : i + 1}</div>
                    <b style={{ fontSize: 11, fontWeight: cur ? 800 : 600, color: cur ? 'var(--gj-ink)' : 'var(--gj-grey)' }}>{p.label}</b>
                  </div>
                )
              })}
            </div>
          </Section>

          <Section title="Score d'adéquation IA">
            {detail.score == null ? (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gj-grey)' }}>Score en cours de calcul (tâche de fond IA).</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="num" style={{ fontSize: 26, fontWeight: 900, color: 'var(--gj-ink)' }}>{detail.score} <small style={{ fontSize: 14, color: 'var(--gj-grey)' }}>/100</small></div>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--gj-line)', overflow: 'hidden' }}><span aria-hidden style={{ display: 'block', height: '100%', width: `${detail.score}%`, background: scoreColor(detail.score) }} /></div>
                </div>
                {detail.scoreRaison && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--gj-grey)' }}>{detail.scoreRaison}</p>}
              </>
            )}
          </Section>

          <Section title="Candidat & opportunité">
            <div style={KV}>
              <Field label="Candidat"><Link href={`/admin/utilisateurs/${detail.candidatCjsUid}`} style={{ color: 'var(--gj-admin-gold)' }}>{detail.candidatPrenom} {detail.candidatNom}</Link></Field>
              <Field label="Offre"><Link href={`/admin/opportunites/${detail.opportuniteId}/apercu`} style={{ color: 'var(--gj-ink)' }}>{detail.opportuniteTitre}</Link></Field>
              <Field label="Recruteur">{detail.recruteur}</Field>
              <Field label="Statut">{STATUT_LABEL[detail.statut] ?? detail.statut}</Field>
            </div>
          </Section>

          <Section title="Documents transmis">
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 12 }}>
              {detail.cvUrl
                ? <Link href={detail.cvUrl} target="_blank" style={{ ...FOOTBTN, flex: 'none', textDecoration: 'none' }}><Icon name="download" size={14} /> CV</Link>
                : <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>Aucun CV transmis</span>}
              {detail.lettreMotivation && <button type="button" onClick={() => setShowLettre((v) => !v)} style={{ ...FOOTBTN, flex: 'none' }}>Lettre de motivation</button>}
            </div>
            {showLettre && detail.lettreMotivation && (
              <p style={{ fontSize: 12.5, color: 'var(--gj-grey)', whiteSpace: 'pre-wrap', background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '12px 14px', marginBottom: 12 }}>{detail.lettreMotivation}</p>
            )}
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gj-grey)', marginBottom: 7 }}>Snapshot figé (GUIC-361)</div>
            <div style={KV}>
              <Field label="Niveau">{detail.snapshot.niveauEtude ?? '—'}</Field>
              <Field label="Situation">{detail.snapshot.situationEmploi ?? '—'}</Field>
              <Field label="Téléphone">{detail.snapshot.telephone ?? '—'}</Field>
              <Field label="E-mail">{detail.snapshot.email ?? '—'}</Field>
              <Field label="Compétences">{detail.snapshot.competences.length ? detail.snapshot.competences.join(', ') : '—'}</Field>
              <Field label="Domaines d'intérêt">{detail.snapshot.domainesInteret.length ? detail.snapshot.domainesInteret.join(', ') : '—'}</Field>
            </div>
          </Section>

          <Section title="Entretiens">
            {detail.entretiens.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gj-grey)' }}>Aucun entretien planifié.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {detail.entretiens.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '11px 13px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13, color: 'var(--gj-ink)' }}>{e.dateLabel} · {e.mode}</b>
                      {e.lieu && <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.lieu}</div>}
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: 'var(--gj-line)', color: 'var(--gj-grey)', whiteSpace: 'nowrap' }}>{ENT_STATUT[e.statut] ?? e.statut}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Consentement CGU (traçabilité CDP)">
            <div style={KV}>
              <Field label="Version CGU">{detail.consent.version ?? '—'}</Field>
              <Field label="Consenti le">{detail.consent.consentiLe ?? '—'}</Field>
              <Field label="Adresse IP"><span className="num">{detail.consent.ip ?? '—'}</span></Field>
              <Field label="Notifications">{detail.consent.notifications ? 'Acceptées' : 'Refusées'}</Field>
            </div>
          </Section>

          {detail.relances.length > 0 && (
            <Section title="Historique des relances (CDP)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.relances.map((r) => (
                  <div key={r.id} style={{ background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '10px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 12.5, color: 'var(--gj-ink)' }}>{r.destinataire}</b>
                      <span style={{ fontSize: 11, color: 'var(--gj-grey)' }}>· {r.canaux.join(', ')}</span>
                      <time style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gj-grey)' }}>{r.dateLabel}</time>
                    </div>
                    {r.message && <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--gj-grey)' }}>{r.message}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div id="cand-conversation">
            <Section title="Conversation candidat ↔ recruteur (lecture seule)">
              {!detail.conversation || detail.conversation.messages.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gj-grey)' }}>Aucun message échangé.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.conversation.messages.map((m: DetailMessage) => {
                    const cote = m.auteur === 'recruteur'
                    return (
                      <div key={m.id} style={{ alignSelf: cote ? 'flex-end' : 'flex-start', maxWidth: '85%', background: cote ? 'var(--gj-blue-soft)' : 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '9px 12px' }}>
                        <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gj-grey)', marginBottom: 3 }}>{m.auteur === 'recruteur' ? 'Recruteur' : m.auteur === 'candidat' ? 'Candidat' : 'Système'} · {m.dateLabel}</div>
                        <div style={{ fontSize: 13, color: 'var(--gj-ink)' }}>{m.corps}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>
          </div>
        </div>

        {/* Footer — supervision : Voir la conversation · Relancer · Exporter (aucune décision) */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--gj-line)', display: 'flex', gap: 9, background: 'var(--gj-surface)' }}>
          <button type="button" onClick={scrollToConv} style={FOOTBTN}><Icon name="chat" size={15} /> Voir la conversation</button>
          <button type="button" onClick={() => onRelancer?.(detail)} style={FOOTBTN}><Icon name="bell" size={15} /> Relancer</button>
          <button type="button" onClick={() => onExporter?.(detail)} style={{ ...FOOTBTN, background: 'var(--gj-admin-gold)', color: 'var(--gj-admin-on-gold)', border: '1px solid transparent' }}><Icon name="download" size={15} /> Exporter</button>
        </div>
      </aside>
    </>
  )
}
