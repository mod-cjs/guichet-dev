import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui/Icon'
import { RichContent } from '@/components/ui/RichContent'
import { MembresSection, type MembreVM } from './MembresSection'

export const metadata: Metadata = { title: 'Partenaire — Admin CJS' }

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon', publiee: 'Publiée', archivee: 'Archivée', expiree: 'Expirée',
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const { id } = await params
  const org = await prisma.organisation.findUnique({
    where: { id },
    select: {
      id: true, cjsUid: true, nom: true, description: true, logoUrl: true,
      secteur: true, region: true, adresse: true,
      telephone: true, email: true, siteWeb: true, estVerifie: true,
      opportunites: {
        where: { deletedAt: null },
        select: { id: true, titre: true, statut: true, slug: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      },
    },
  })
  if (!org) notFound()

  // GUIC-706 (Phase 2b) — Membres (0..N) : rattachements + détails personne (batch par cjsUid,
  // le lien MembreOrganisation.cjsUid → Utilisateur est logique, pas une FK Prisma).
  const membresRaw = await prisma.membreOrganisation.findMany({
    where: { organisationId: org.id },
    select: { id: true, cjsUid: true, role: true, statut: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })
  const membreUsers = membresRaw.length
    ? await prisma.utilisateur.findMany({
        where: { cjsUid: { in: membresRaw.map((m) => m.cjsUid) } },
        select: { cjsUid: true, nom: true, prenom: true, email: true, telephone: true, statut: true },
      })
    : []
  const parUid = new Map(membreUsers.map((u) => [u.cjsUid, u]))
  const membres: MembreVM[] = membresRaw.map((m) => {
    const u = parUid.get(m.cjsUid)
    return {
      id: m.id,
      cjsUid: m.cjsUid,
      nom: u ? `${u.prenom} ${u.nom}`.trim() : m.cjsUid,
      contact: u ? [u.email, u.telephone].filter(Boolean).join(' · ') : '',
      role: m.role,
      statut: m.statut,
      personneStatut: u?.statut ?? 'inconnu',
    }
  })

  const infos = [
    ['Secteur', org.secteur?.replace(/_/g, ' ')],
    ['Région', org.region?.replace(/_/g, ' ')],
    ['Adresse', org.adresse],
    ['Téléphone', org.telephone],
    ['Email', org.email],
    ['Site web', org.siteWeb],
  ].filter(([, v]) => Boolean(v)) as [string, string][]

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Link href="/admin/partenaires" className="inline-flex items-center gap-[6px] text-fs-200 font-bold text-gj-teal-deep hover:underline mb-space-3">
          <Icon name="chevron-left" size={15} /> Retour aux partenaires
        </Link>

        <div className="flex items-center gap-3 flex-wrap mb-4">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={`Logo ${org.nom}`} width={48} height={48} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1.5px solid var(--gj-line)', background: '#fff' }} />
          ) : (
            <span aria-hidden style={{ width: 48, height: 48, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)', fontWeight: 900 }}>{org.nom.slice(0, 2).toUpperCase()}</span>
          )}
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>{org.nom}</h1>
          <span className="inline-flex items-center gap-[4px] rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={org.estVerifie ? { background: 'var(--gj-green-soft, #e6f6ec)', color: 'var(--gj-green-ink, #1a7a3d)' } : { background: 'var(--gj-line)', color: 'var(--gj-grey)' }}>
            {org.estVerifie ? <><Icon name="check-circle" size={11} /> Vérifié</> : 'Non vérifié'}
          </span>
        </div>

        {org.description && (
          <div className="rounded-[14px] p-[18px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
            <h2 className="text-[14px] font-black mb-[8px]" style={{ color: 'var(--gj-ink)' }}>Présentation</h2>
            <RichContent html={org.description} className="text-[13.5px]" />
          </div>
        )}

        <div className="rounded-[14px] p-[18px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <h2 className="text-[14px] font-black mb-[10px]" style={{ color: 'var(--gj-ink)' }}>Coordonnées</h2>
          {infos.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucune coordonnée renseignée.</p>
          ) : (
            <dl className="grid gap-[8px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {infos.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--gj-grey)' }}>{k}</dt>
                  <dd className="text-[13.5px]" style={{ color: 'var(--gj-ink)' }}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* GUIC-706 — Membres 0..N (remplace « Compte recruteur » 1:1) */}
        <MembresSection organisationId={org.id} membres={membres} />

        <div className="rounded-[14px] p-[18px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <h2 className="text-[14px] font-black mb-[12px]" style={{ color: 'var(--gj-ink)' }}>
            Opportunités publiées ({org.opportunites.length})
          </h2>
          {org.opportunites.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucune opportunité pour ce partenaire.</p>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {org.opportunites.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 text-[13.5px] py-[6px]" style={{ borderBottom: '1px solid var(--gj-line)' }}>
                  <span className="font-bold" style={{ color: 'var(--gj-ink)' }}>{o.titre}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--gj-grey)' }}>{STATUT_LABEL[o.statut] ?? o.statut}</span>
                    <Link href={`/admin/opportunites/${o.id}/modifier`} className="text-[12px] font-bold text-gj-teal-deep hover:underline">Éditer</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
