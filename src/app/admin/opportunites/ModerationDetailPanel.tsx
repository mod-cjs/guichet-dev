'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { ModerationDetail } from '@/lib/loaders/moderation-detail'

const SRC_LABEL: Record<ModerationDetail['source'], string> = {
  recruteur: 'Recruteur',
  veille: 'Veille',
  admin: 'Admin',
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <i style={{ display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gj-grey-2)', fontStyle: 'normal', marginBottom: 4 }}>
        {label}
      </i>
      <span style={{ fontSize: 13, color: 'var(--gj-ink)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

/**
 * GUIC-702 · PR-B — panneau détail (slide-over) d'une offre en modération.
 * Lecture : identité, signaux, description complète, partenaire, historique.
 * Décision : Approuver / Corriger / Rejeter délégués au parent (actions serveur).
 */
export function ModerationDetailPanel({
  detail,
  onClose,
  onApprouver,
  onRejeter,
  onCorriger,
}: {
  detail: ModerationDetail
  onClose: () => void
  onApprouver: () => void
  onRejeter: () => void
  onCorriger: () => void
}) {
  const asideRef = useRef<HTMLElement>(null)
  // Accessibilité (checklist §6) : fermeture au clavier + focus au panneau à l'ouverture.
  useEffect(() => {
    asideRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const kvs: { label: string; value: string }[] = [
    { label: 'Source', value: SRC_LABEL[detail.source] },
    { label: 'Organisation', value: detail.organisation },
    ...(detail.region ? [{ label: 'Région', value: detail.region }] : []),
    ...detail.champsTypes, // écart E — champs propres au sous-type (Contrat/Places/Montant…)
    ...(detail.remuneration ? [{ label: 'Rémunération', value: detail.remuneration }] : []),
    ...(detail.deadlineLabel ? [{ label: 'Clôture', value: detail.deadlineLabel }] : []),
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,12,10,.6)', backdropFilter: 'blur(4px)', zIndex: 100 }} />
      <aside
        ref={asideRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Dossier de modération — ${detail.titre}`}
        style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(560px, 96vw)', background: 'var(--gj-bg)', borderLeft: '1px solid var(--gj-line-strong)', boxShadow: '-24px 0 70px rgba(0,0,0,.5)', zIndex: 101, display: 'flex', flexDirection: 'column', outline: 'none' }}
      >
        {/* En-tête */}
        <header style={{ padding: '18px 20px 15px', borderBottom: '1px solid var(--gj-line)', background: 'var(--gj-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)', textTransform: 'uppercase' }}>
              {detail.typeLabel}
            </span>
            {detail.niveau && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase', background: detail.niveau === 'crit' ? 'var(--gj-red-soft)' : 'var(--gj-yellow-soft)', color: detail.niveau === 'crit' ? 'var(--gj-red-ink)' : 'var(--gj-yellow-ink)' }}>
                <Icon name={detail.niveau === 'crit' ? 'alert' : 'info'} size={11} />
                {detail.niveau === 'crit' ? 'Signalée' : 'À vérifier'}
              </span>
            )}
            <span style={{ fontSize: 11.5, color: 'var(--gj-grey)', fontWeight: 700 }}>{detail.ageLabel}</span>
            <a
              href={`/admin/opportunites/${detail.id}/apercu`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Aperçu de l’offre"
              title="Aperçu (nouvel onglet)"
              style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 9, border: '1px solid var(--gj-line)', background: 'var(--gj-bg)', color: 'var(--gj-grey)', display: 'grid', placeItems: 'center' }}
            >
              <Icon name="eye" size={16} />
            </a>
            <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--gj-line)', background: 'var(--gj-bg)', color: 'var(--gj-grey)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, lineHeight: 1.25, color: 'var(--gj-ink)' }}>{detail.titre}</h3>
        </header>

        {/* Corps */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Champs clés */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px 16px', background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '14px 15px' }}>
            {kvs.map((kv) => (
              <KV key={kv.label} label={kv.label} value={kv.value} />
            ))}
          </section>

          {/* Signaux */}
          {detail.signaux.length > 0 && (
            <section>
              <h6 style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)' }}>Signaux détectés</h6>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {detail.signaux.map((s, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: s.niveau === 'crit' ? 'var(--gj-red-ink)' : 'var(--gj-yellow-ink)' }}>
                    <Icon name={s.niveau === 'crit' ? 'alert' : 'info'} size={13} />
                    {s.motif}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Description */}
          <section>
            <h6 style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)' }}>Description</h6>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--gj-grey)', whiteSpace: 'pre-wrap' }}>{detail.description}</p>
          </section>

          {/* Partenaire */}
          {detail.partenaire && (
            <section style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '13px 14px' }}>
              <span style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--gj-admin-badge-muted-bg)', display: 'grid', placeItems: 'center', fontWeight: 900, color: 'var(--gj-yellow-ink)', flex: 'none' }}>
                {detail.partenaire.nom.slice(0, 2).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14, color: 'var(--gj-ink)' }}>{detail.partenaire.nom}</b>
                <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>{detail.partenaire.offresPubliees} offre{detail.partenaire.offresPubliees > 1 ? 's' : ''} publiée{detail.partenaire.offresPubliees > 1 ? 's' : ''}</span>
                  <span style={{ fontWeight: 800, color: detail.partenaire.estVerifie ? 'var(--gj-green-ink)' : 'var(--gj-yellow-ink)' }}>
                    {detail.partenaire.estVerifie ? 'Vérifié' : 'Non vérifié'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Historique */}
          {detail.historique.length > 0 && (
            <section>
              <h6 style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)' }}>Historique de modération</h6>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '5px 14px' }}>
                {detail.historique.map((h, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '10px 0', fontSize: 12.5, color: 'var(--gj-grey)', borderBottom: i < detail.historique.length - 1 ? '1px solid var(--gj-line)' : 'none' }}>
                    <span>
                      <b style={{ color: 'var(--gj-ink)', fontWeight: 700 }}>{h.verbe}</b>
                      {h.detail ? ` — ${h.detail}` : ''}
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--gj-grey-2)' }}>{h.actorLabel}</span>
                    </span>
                    <time style={{ fontSize: 11, color: 'var(--gj-grey-2)', whiteSpace: 'nowrap' }}>{h.dateLabel}</time>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Pied — décision (supervision : publier / corriger / rejeter) */}
        <footer style={{ padding: '14px 20px', borderTop: '1px solid var(--gj-line)', display: 'flex', gap: 9, background: 'var(--gj-surface)' }}>
          <button type="button" onClick={onApprouver} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 9, fontSize: 13, fontWeight: 800, border: 0, cursor: 'pointer', background: 'var(--gj-green)', color: '#08130E' }}>
            <Icon name="check" size={15} /> Approuver
          </button>
          <button type="button" onClick={onCorriger} aria-label="Demander correction" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 14px', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: 'var(--gj-teal-deep)', border: '1px solid var(--gj-teal)' }}>
            <Icon name="settings" size={15} /> Corriger
          </button>
          <button type="button" onClick={onRejeter} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 14px', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: 'var(--gj-red-ink)', border: '1px solid var(--gj-red)' }}>
            <Icon name="close" size={15} /> Rejeter
          </button>
        </footer>
      </aside>
    </>
  )
}
