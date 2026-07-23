import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui/Icon'
import { ProfilEntrepriseForm } from './ProfilEntrepriseForm'
import { MeetCard } from './MeetCard'
import { getMeetEtat } from '@/lib/google-meet'

export const metadata: Metadata = { title: 'Profil entreprise — Espace Recruteur' }
export const dynamic = 'force-dynamic'

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
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 className="text-[24px] font-black mb-6" style={{ color: 'var(--gj-ink)' }}>Profil entreprise</h1>
        <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
          <p className="text-[14px] font-bold">Aucune organisation associée à votre compte.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* En-tête (nom + vérification : gérés par l'admin, lecture seule) */}
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
        <span className="text-[12px] ml-auto" style={{ color: 'var(--gj-grey)' }}>{org._count.opportunites} offre{org._count.opportunites > 1 ? 's' : ''}</span>
      </div>

      <ProfilEntrepriseForm
        initial={{
          description: org.description, secteur: org.secteur, region: org.region,
          adresse: org.adresse, telephone: org.telephone, email: org.email,
          siteWeb: org.siteWeb, logoUrl: org.logoUrl,
        }}
      />

      <MeetCard etat={await getMeetEtat(session.cjsUid)} />

      <p className="text-[11px] mt-4" style={{ color: 'var(--gj-grey)' }}>Le <strong>nom</strong> et le statut de <strong>vérification</strong> sont gérés par l’administration CJS.</p>
    </div>
  )
}
