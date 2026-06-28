'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { pseudonymizeText } from '@/lib/ia/metrics/pseudonymize'
import type { ReconstructedTranscript, TranscriptEvent } from '@/lib/ia/metrics/transcript'
import type { SessionRef } from '@/lib/ia/admin/session-refs'

/** Masque les PII directes (email/tél/UUID) tant que l'admin n'a pas révélé. */
function maybeMask(text: string, reveal: boolean): string {
  return reveal ? text : pseudonymizeText(text)
}

export interface SessionDetailClientProps {
  transcript: ReconstructedTranscript
  refs: SessionRef[]
}

const REF_ICON: Record<SessionRef['kind'], 'user' | 'employment' | 'pin'> = {
  beneficiaire: 'user',
  opportunite: 'employment',
  ressource: 'pin',
}
const REF_LABEL: Record<SessionRef['kind'], string> = {
  beneficiaire: 'Bénéficiaire',
  opportunite: 'Opportunité',
  ressource: 'Ressource',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function heure(ms: number | null): string {
  if (ms == null) return '—'
  return new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function dureeMs(ms: number): string {
  if (ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`
}

// Couleur de la pastille par type d'événement (lecture rapide du flux technique).
function eventTone(type: string): { bg: string; fg: string } {
  if (type === 'erreur') return { bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' }
  if (type === 'escalade_conseiller') return { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' }
  if (type === 'reponse_generee' || type === 'contenu_transmis') return { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' }
  if (type === 'graph_interroge' || type === 'api_appelee') return { bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' }
  return { bg: 'var(--gj-bg)', fg: 'var(--gj-grey)' }
}

function statutTone(statut: string): { bg: string; fg: string } {
  if (statut === 'echec') return { bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' }
  if (statut === 'partiel') return { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' }
  return { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' }
}

function prettyPayload(p: unknown): string | null {
  if (p == null) return null
  try {
    const s = JSON.stringify(p, null, 2)
    return s === '{}' || s === 'null' ? null : s
  } catch {
    return null
  }
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function SessionDetailClient({ transcript: t, refs }: SessionDetailClientProps) {
  const [tab, setTab] = useState<'conversation' | 'technique'>('conversation')
  // CDP : le verbatim et les payloads d'outils peuvent contenir des PII brutes.
  // Masqués par défaut ; révélés explicitement par l'admin (investigation).
  const [reveal, setReveal] = useState(false)

  const canalLabel = t.canal === 'whatsapp' ? 'WhatsApp' : t.canal === 'web' ? 'Web' : '—'

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* ── Fil d'ariane + en-tête ── */}
        <Link href="/admin/yaye/sessions" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--gj-grey)', textDecoration: 'none', marginBottom: 12 }}>
          <Icon name="chevron-left" size={14} />
          Retour aux sessions
        </Link>

        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--gj-ink)' }}>Session Yaye</h1>
          <p style={{ fontSize: 12.5, color: 'var(--gj-grey)', marginTop: 4, fontFamily: 'monospace' }}>{t.sessionId}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <Meta label="Canal" value={canalLabel} />
            <Meta label="Utilisateur" value={t.cjsUid ?? 'Anonyme'} />
            <Meta label="Centre" value={t.centreId ?? '—'} />
            <Meta label="Tours" value={String(t.nbTours)} />
            <Meta label="Durée" value={dureeMs(t.dureeMs)} />
            {t.escalade && <Meta label="Escalade" value="Conseiller" tone="warn" />}
          </div>
        </div>

        {/* ── Fiches métier liées (spec §57) ── */}
        {refs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 7 }}>
              Fiches liées
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {refs.map((r, i) => (
                <Link
                  key={`${r.kind}-${i}`}
                  href={r.href}
                  title={REF_LABEL[r.kind]}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, padding: '7px 12px', borderRadius: 999, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-teal-deep)', textDecoration: 'none', maxWidth: 320 }}
                >
                  <Icon name={REF_ICON[r.kind]} size={14} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase' }}>{REF_LABEL[r.kind]}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                  <Icon name="external" size={12} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Onglets + bascule confidentialité ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1.5px solid var(--gj-line)', marginBottom: 16, flexWrap: 'wrap' }}>
          <div role="tablist" aria-label="Niveau de détail" style={{ display: 'flex', gap: 4 }}>
            <TabBtn active={tab === 'conversation'} onClick={() => setTab('conversation')} icon="chat" label="Conversation" />
            <TabBtn active={tab === 'technique'} onClick={() => setTab('technique')} icon="settings" label="Technique" />
          </div>
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-pressed={reveal}
            title="Le verbatim et les arguments d'outils peuvent contenir des données personnelles (CDP)."
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
              fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
              border: `1.5px solid ${reveal ? 'var(--gj-red-ink)' : 'var(--gj-line)'}`,
              background: reveal ? 'var(--gj-red-soft)' : 'var(--gj-surface)',
              color: reveal ? 'var(--gj-red-ink)' : 'var(--gj-grey)',
            }}
          >
            <Icon name={reveal ? 'eye' : 'eye-off'} size={14} />
            {reveal ? 'Données personnelles affichées' : 'Révéler les données personnelles'}
          </button>
        </div>

        {tab === 'conversation' ? (
          <ConversationView t={t} reveal={reveal} />
        ) : (
          <TechniqueView events={t.events} reveal={reveal} />
        )}
      </div>
    </div>
  )
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function Meta({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 11px', borderRadius: 9, background: tone === 'warn' ? 'var(--gj-yellow-soft)' : 'var(--gj-bg)', border: '1px solid var(--gj-line)' }}>
      <span style={{ color: 'var(--gj-grey)', fontWeight: 700 }}>{label}</span>
      <span style={{ color: tone === 'warn' ? 'var(--gj-yellow-ink)' : 'var(--gj-ink)', fontWeight: 800 }}>{value}</span>
    </span>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: 'chat' | 'settings'; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
        fontSize: 13.5, fontWeight: 800, fontFamily: 'inherit',
        color: active ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
        borderBottom: active ? '2.5px solid var(--gj-teal-deep)' : '2.5px solid transparent',
        marginBottom: -1.5,
      }}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  )
}

function ConversationView({ t, reveal }: { t: ReconstructedTranscript; reveal: boolean }) {
  if (!t.hasVerbatimText) {
    return (
      <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: '20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--gj-grey)' }}>
          <Icon name="info" size={16} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>Texte verbatim indisponible (canal web — non persisté par conception CDP)</span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--gj-grey)', marginBottom: 14 }}>
          On affiche la structure des échanges (intentions, outils, blocs). Le contenu mot-à-mot reste dans l'onglet Technique uniquement sous forme de longueurs.
        </p>
        {/* Structure des tours */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {t.turns.map((turn) => (
            <div key={turn.index} style={{ border: '1px solid var(--gj-line)', borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
                Tour {turn.index + 1}{turn.userLength != null ? ` · message ~${turn.userLength} car.` : ''}
              </div>
              {turn.intentions.length > 0 && (
                <Tags label="Intentions" items={turn.intentions} />
              )}
              {turn.toolsUsed.length > 0 && (
                <Tags label="Outils" items={turn.toolsUsed} />
              )}
              {turn.blocs.length > 0 && (
                <Tags label="Blocs transmis" items={turn.blocs} />
              )}
              {turn.escalade && <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gj-yellow-ink)' }}>↗ Escalade conseiller</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Transcription verbatim (WhatsApp).
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {t.turns.map((turn) => (
        <div key={turn.index} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {turn.userText && (
            <Bubble side="user" text={maybeMask(turn.userText, reveal)} />
          )}
          {turn.assistantText && (
            <Bubble side="yaye" text={maybeMask(turn.assistantText, reveal)} meta={turn.toolsUsed} />
          )}
          {turn.escalade && (
            <div style={{ alignSelf: 'center', fontSize: 11.5, fontWeight: 800, color: 'var(--gj-yellow-ink)', background: 'var(--gj-yellow-soft)', padding: '4px 12px', borderRadius: 999 }}>
              ↗ Escalade vers un conseiller
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Bubble({ side, text, meta }: { side: 'user' | 'yaye'; text: string; meta?: string[] }) {
  const isUser = side === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: '76%', padding: '10px 14px', borderRadius: 14, background: isUser ? 'var(--gj-teal)' : 'var(--gj-surface)', color: isUser ? 'var(--gj-surface)' : 'var(--gj-ink)', border: isUser ? 'none' : '1.5px solid var(--gj-line)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.7, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.4px' }}>
          {isUser ? 'Jeune' : 'Yaye'}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{text}</div>
        {meta && meta.length > 0 && (
          <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 6 }}>outils : {meta.join(', ')}</div>
        )}
      </div>
    </div>
  )
}

function Tags({ label, items }: { label: string; items: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--gj-grey)', fontWeight: 700 }}>{label} :</span>
      {items.map((it, i) => (
        <span key={`${it}-${i}`} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--gj-bg)', border: '1px solid var(--gj-line)', color: 'var(--gj-ink)' }}>{it}</span>
      ))}
    </div>
  )
}

function TechniqueView({ events, reveal }: { events: TranscriptEvent[]; reveal: boolean }) {
  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '64px 1.4fr 1fr 0.7fr 0.7fr', gap: 10, padding: '10px 16px', borderBottom: '1.5px solid var(--gj-line)', background: 'var(--gj-bg)', fontSize: 10, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }} className="hidden md:grid">
        <span>Heure</span>
        <span>Événement</span>
        <span>Outil</span>
        <span>Statut</span>
        <span>Durée</span>
      </div>
      {events.map((ev, i) => {
        const et = eventTone(ev.type)
        const st = statutTone(ev.statut)
        const raw = prettyPayload(ev.payload)
        const payload = raw == null ? null : maybeMask(raw, reveal)
        return (
          <details key={i} style={{ borderBottom: '1px solid var(--gj-line)' }}>
            <summary style={{ display: 'grid', gridTemplateColumns: '64px 1.4fr 1fr 0.7fr 0.7fr', gap: 10, padding: '10px 16px', alignItems: 'center', cursor: payload ? 'pointer' : 'default', listStyle: 'none' }} className="!grid grid-cols-2 md:!grid-cols-[64px_1.4fr_1fr_0.7fr_0.7fr]">
              <span style={{ fontSize: 11, color: 'var(--gj-grey)', fontFamily: 'monospace' }}>{heure(ev.tsMs)}</span>
              <span>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: et.bg, color: et.fg }}>{ev.type}</span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--gj-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.toolCalled ?? '—'}</span>
              <span>
                <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.fg }}>{ev.statut}</span>
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--gj-grey)' }}>{ev.dureeMs != null ? `${ev.dureeMs} ms` : '—'}</span>
            </summary>
            {payload && (
              <pre style={{ margin: 0, padding: '10px 16px 14px', fontSize: 11.5, lineHeight: 1.5, color: 'var(--gj-ink)', background: 'var(--gj-bg)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{payload}</pre>
            )}
          </details>
        )
      })}
    </div>
  )
}
