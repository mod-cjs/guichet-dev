import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = { title: 'Profil entreprise — Espace Recruteur' }

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const org = await prisma.organisation.findFirst({
    where: { cjsUid: session.cjsUid },
    select: {
      nom: true, description: true, logoUrl: true, secteur: true, region: true,
      adresse: true, telephone: true, email: true, siteWeb: true, estVerifie: true,
      _count: { select: { opportunites: true } },
    },
  })

  if (!org) {
    return (
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <h1 className="text-[24px] font-black mb-6" style={{ color: 'var(--gj-ink)' }}>Profil entreprise</h1>
        <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
          <p className="text-[14px] font-bold">Aucune organisation associée à votre compte.</p>
        </div>
      </div>
    )
  }

  const infos = [
    ['Secteur', org.secteur?.replace(/_/g, ' ')],
    ['Région', org.region?.replace(/_/g, ' ')],
    ['Adresse', org.adresse],
    ['Téléphone', org.telephone],
    ['Email', org.email],
    ['Site web', org.siteWeb],
  ].filter(([, v]) => Boolean(v)) as [string, string][]

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <div className="flex items-center gap-3 flex-wrap mb-6">
        {org.logoUrl ? (
          <img src={org.logoUrl} alt={`Logo ${org.nom}`} width={56} height={56} style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: '1.5px solid var(--gj-line)', background: '#fff' }} />
        ) : (
          <span aria-hidden style={{ width: 56, height: 56, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gj-blue, #1A4ED8)', color: '#fff', fontWeight: 900, fontSize: 20 }}>{org.nom.slice(0, 1).toUpperCase()}</span>
        )}
        <div>
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>{org.nom}</h1>
          <span className="inline-flex items-center gap-[4px] rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={org.estVerifie ? { background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' } : { background: 'var(--gj-line)', color: 'var(--gj-grey)' }}>
            {org.estVerifie ? <><Icon name="check-circle" size={11} /> Partenaire vérifié</> : 'Non vérifié'}
          </span>
        </div>
      </div>

      {org.description && (
        <div className="rounded-[14px] p-[18px] mb-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <h2 className="text-[14px] font-black mb-[8px]" style={{ color: 'var(--gj-ink)' }}>Présentation</h2>
          <p className="text-[13.5px] whitespace-pre-line" style={{ color: 'var(--gj-ink)' }}>{org.description}</p>
        </div>
      )}

      <div className="rounded-[14px] p-[18px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        <h2 className="text-[14px] font-black mb-[10px]" style={{ color: 'var(--gj-ink)' }}>Coordonnées · {org._count.opportunites} offre{org._count.opportunites > 1 ? 's' : ''}</h2>
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
        <p className="text-[11px] mt-[12px]" style={{ color: 'var(--gj-grey)' }}>Les informations de l’entreprise sont gérées par l’administration CJS.</p>
      </div>
    </div>
  )
}
