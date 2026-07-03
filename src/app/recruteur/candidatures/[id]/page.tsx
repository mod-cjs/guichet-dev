import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditPiiAccess, recordAudit } from '@/lib/audit'
import { getRecruteurContext, getRecruteurCandidatureDetail, scoreColors } from '@/lib/loaders/recruteur'
import { Icon, type IconName } from '@/components/ui/Icon'
import { StatutActions } from './StatutActions'
import { ContacterButton } from './ContacterButton'
import { PlanifierEntretienInline } from './PlanifierEntretienInline'

export const metadata: Metadata = { title: 'Candidature — Espace Recruteur' }

const CAND_LABEL: Record<string, string> = {
  En_attente: 'À examiner', Vue: 'Vue', Retenue: 'Retenue', Refusee: 'Refusée',
}
function candColors(s: string): { bg: string; fg: string } {
  switch (s) {
    case 'Retenue': return { bg: 'var(--gj-green-soft, #e6f6ec)', fg: 'var(--gj-green-ink, #1a7a3d)' }
    case 'Refusee': return { bg: 'var(--gj-red-soft, #fdecec)', fg: 'var(--gj-red-ink)' }
    case 'Vue': return { bg: 'var(--gj-line)', fg: 'var(--gj-grey)' }
    default: return { bg: 'var(--gj-blue-soft, #E8EFFF)', fg: 'var(--gj-blue-ink, #1A3FA8)' }
  }
}
function initials(prenom: string, nom: string): string {
  return ((prenom.trim()[0] ?? '') + (nom.trim()[0] ?? '')).toUpperCase()
}
function frDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
/** Humanise un code enum/stocké (DAKAR, en_recherche_emploi) → « Dakar », « En recherche emploi ». */
function humanize(s: string): string {
  const t = s.replace(/[_-]+/g, ' ').trim().toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const { id } = await params
  const ctx = await getRecruteurContext(session.cjsUid)
  const detail = await getRecruteurCandidatureDetail(session.cjsUid, ctx.organisationId, id)
  if (!detail) notFound()

  // CDP : consultation de la fiche candidat (coordonnées) journalisée.
  await auditPiiAccess('candidature.pii.view', session.cjsUid, {
    targetCjsUid: detail.candidat.cjsUid,
    meta: { candidatureId: id },
  })

  // Auto-Vue : la première ouverture d'une candidature « À examiner » la passe en « Vue ».
  let statut = detail.statut
  if (statut === 'En_attente') {
    const r = await prisma.candidature.updateMany({ where: { id, statut: 'En_attente' }, data: { statut: 'Vue' } })
    if (r.count > 0) {
      statut = 'Vue'
      await recordAudit(session.cjsUid, 'candidature.statut', { targetType: 'candidature', targetId: id, meta: { statut: 'Vue', auto: true } })
    }
  }

  const col = candColors(statut)
  const contacts: { icon: IconName; label: string; value: string; href?: string }[] = []
  if (detail.candidat.email) contacts.push({ icon: 'mail', label: 'Email', value: detail.candidat.email, href: `mailto:${detail.candidat.email}` })
  if (detail.candidat.telephone) contacts.push({ icon: 'phone', label: 'Téléphone', value: detail.candidat.telephone, href: `tel:${detail.candidat.telephone}` })

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <Link href="/recruteur/candidatures" className="inline-flex items-center gap-[6px] text-[12.5px] font-bold no-underline mb-[12px]" style={{ color: 'var(--gj-blue-ink, #1A3FA8)' }}>
        <Icon name="chevron-left" size={14} /> Candidatures
      </Link>

      {/* En-tête candidat */}
      <div className="rounded-[14px] p-[18px] mb-4 flex items-center gap-3 flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        <span aria-hidden style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-blue, #1A4ED8), var(--gj-blue-ink, #1A3FA8))', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>{initials(detail.candidat.prenom, detail.candidat.nom)}</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-[20px] font-black" style={{ color: 'var(--gj-ink)' }}>{detail.candidat.prenom} {detail.candidat.nom}</h1>
          <p className="text-[12.5px]" style={{ color: 'var(--gj-grey)' }}>Candidature à « {detail.offre.titre} » · {frDate(detail.soumiseA)}</p>
        </div>
        <span className="inline-block rounded-full text-[10.5px] font-black px-[10px] py-[3px] uppercase tracking-wide" style={{ background: col.bg, color: col.fg }}>{CAND_LABEL[statut] ?? statut}</span>
      </div>

      {/* Score d'adéquation (IA) */}
      {(() => {
        const sc = scoreColors(detail.score)
        return (
          <div className="rounded-[14px] p-[16px] mb-4 flex items-center gap-3 flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
            <span className="inline-flex items-center justify-center rounded-[12px] text-[16px] font-black" style={{ minWidth: 60, height: 46, padding: '0 12px', background: sc.bg, color: sc.fg }}>{sc.label}</span>
            <div className="flex-1 min-w-[200px]">
              <div className="text-[13px] font-black" style={{ color: 'var(--gj-ink)' }}>Score d&apos;adéquation <span style={{ color: 'var(--gj-grey)', fontWeight: 600 }}>· IA</span></div>
              <p className="text-[12.5px]" style={{ color: 'var(--gj-grey)' }}>{detail.scoreRaison ?? (detail.score == null ? 'Analyse en cours…' : 'Correspondance profil candidat / offre.')}</p>
            </div>
          </div>
        )
      })()}

      {/* Profil du candidat (GUIC-517) */}
      {(() => {
        const c = detail.candidat
        const facts: { label: string; value: string }[] = []
        if (c.age != null) facts.push({ label: 'Âge', value: `${c.age} ans` })
        if (c.commune) facts.push({ label: 'Commune', value: c.commune })
        if (c.region) facts.push({ label: 'Région', value: humanize(c.region) })
        if (c.niveauEtude) facts.push({ label: "Niveau d'étude", value: humanize(c.niveauEtude) })
        if (c.situationEmploi) facts.push({ label: 'Situation', value: humanize(c.situationEmploi) })
        const hasProfil = facts.length > 0 || c.biographie || c.domainesInteret.length > 0
        if (!hasProfil) return null
        return (
          <div className="rounded-[14px] p-[18px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
            <h2 className="text-[13px] font-black mb-[12px]" style={{ color: 'var(--gj-ink)' }}>Profil du candidat</h2>
            {facts.length > 0 && (
              <div className="grid gap-[12px] mb-[4px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                {facts.map((f) => (
                  <div key={f.label}>
                    <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--gj-grey)' }}>{f.label}</div>
                    <div className="text-[14px] font-bold" style={{ color: 'var(--gj-ink)' }}>{f.value}</div>
                  </div>
                ))}
              </div>
            )}
            {c.biographie && (
              <div className="mt-[12px] pt-[12px]" style={{ borderTop: '1px solid var(--gj-line)' }}>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-[4px]" style={{ color: 'var(--gj-grey)' }}>Biographie</div>
                <p className="text-[13.5px] whitespace-pre-line" style={{ color: 'var(--gj-ink)' }}>{c.biographie}</p>
              </div>
            )}
            {c.domainesInteret.length > 0 && (
              <div className="mt-[12px] pt-[12px]" style={{ borderTop: '1px solid var(--gj-line)' }}>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-[8px]" style={{ color: 'var(--gj-grey)' }}>Domaines d&apos;intérêt</div>
                <div className="flex flex-wrap gap-[7px]">
                  {c.domainesInteret.map((d) => (
                    <span key={d} className="inline-block rounded-full text-[12px] font-bold px-[11px] py-[4px]" style={{ background: 'var(--gj-line)', color: 'var(--gj-ink)' }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Compétences — rapprochement avec l'offre (GUIC-517) */}
      {(() => {
        const m = detail.competencesMatch
        if (m.requises.length === 0 && m.autres.length === 0) return null
        const cov = scoreColors(m.requises.length ? m.tauxCouverture : null)
        return (
          <div className="rounded-[14px] p-[18px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
            <div className="flex items-center gap-2 justify-between flex-wrap mb-[12px]">
              <h2 className="text-[13px] font-black" style={{ color: 'var(--gj-ink)' }}>Compétences</h2>
              {m.requises.length > 0 && (
                <span className="inline-flex items-center gap-[6px] rounded-full text-[12px] font-black px-[11px] py-[4px]" style={{ background: cov.bg, color: cov.fg }}>
                  <Icon name="check" size={13} /> {m.tauxCouverture}% des compétences requises
                </span>
              )}
            </div>
            {m.requises.length > 0 && (
              <div className="flex flex-wrap gap-[8px] mb-[6px]">
                {m.requises.map((r) => (
                  <span key={r.libelle} className="inline-flex items-center gap-[6px] rounded-full text-[12.5px] font-bold px-[11px] py-[5px]"
                    style={r.possede
                      ? { background: 'var(--gj-green-soft, #e6f6ec)', color: 'var(--gj-green-ink, #1a7a3d)' }
                      : { background: 'var(--gj-red-soft, #fdecec)', color: 'var(--gj-red-ink)', opacity: 0.9 }}>
                    <Icon name={r.possede ? 'check' : 'close'} size={13} /> {r.libelle}
                  </span>
                ))}
              </div>
            )}
            {m.autres.length > 0 && (
              <div className="mt-[12px] pt-[12px]" style={{ borderTop: '1px solid var(--gj-line)' }}>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-[8px]" style={{ color: 'var(--gj-grey)' }}>
                  {m.requises.length > 0 ? 'Autres compétences' : 'Compétences déclarées'}
                </div>
                <div className="flex flex-wrap gap-[7px]">
                  {m.autres.map((s) => (
                    <span key={s} className="inline-block rounded-full text-[12px] font-bold px-[11px] py-[4px]" style={{ background: 'var(--gj-line)', color: 'var(--gj-ink)' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Coordonnées (PII) */}
      <div className="rounded-[14px] p-[18px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        <h2 className="text-[13px] font-black mb-[10px]" style={{ color: 'var(--gj-ink)' }}>Coordonnées</h2>
        {contacts.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucune coordonnée renseignée.</p>
        ) : (
          <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {contacts.map((c) => (
              <a key={c.label} href={c.href} className="flex items-center gap-[9px] no-underline rounded-[10px] px-[12px] py-[10px]" style={{ background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>
                <Icon name={c.icon} size={16} />
                <span className="text-[13px] font-bold">{c.value}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Lettre de motivation */}
      <div className="rounded-[14px] p-[18px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        <h2 className="text-[13px] font-black mb-[8px]" style={{ color: 'var(--gj-ink)' }}>Lettre de motivation</h2>
        {detail.lettreMotivation ? (
          <p className="text-[13.5px] whitespace-pre-line" style={{ color: 'var(--gj-ink)' }}>{detail.lettreMotivation}</p>
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucune lettre jointe.</p>
        )}
      </div>

      {/* CV + décisions */}
      <div className="rounded-[14px] p-[18px] flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        {detail.hasCv ? (
          <a href={`/api/recruteur/candidatures/${id}/cv`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-[7px] font-bold text-[13px] rounded-[10px] px-[16px] min-h-[44px] no-underline" style={{ color: 'var(--gj-blue-ink, #1A3FA8)', border: '1.5px solid var(--gj-blue, #1A4ED8)' }}>
            <Icon name="download" size={15} /> Consulter le CV
          </a>
        ) : (
          <span className="text-[12.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>Aucun CV joint</span>
        )}
        <div className="flex items-center gap-[10px] flex-wrap">
          <ContacterButton candidatureId={id} />
          <StatutActions id={id} statut={statut} />
        </div>
      </div>

      {/* Planifier un entretien (design v4 RecCandidate) */}
      <div className="rounded-[14px] p-[18px] mt-4 flex items-center gap-3 flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        <div className="flex-1 min-w-[180px]">
          <h2 className="text-[13px] font-black" style={{ color: 'var(--gj-ink)' }}>Entretien</h2>
          <p className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>Proposez un créneau — le candidat sera notifié.</p>
        </div>
        <PlanifierEntretienInline candidatureId={id} />
      </div>
    </div>
  )
}
