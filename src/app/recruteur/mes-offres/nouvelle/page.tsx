import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRecruteurContext } from '@/lib/loaders/recruteur'
import { Icon } from '@/components/ui/Icon'
import { NouvelleOffreForm } from '../NouvelleOffreForm'
import { loadProgrammeOptions } from '@/lib/programmes/options'

export const metadata: Metadata = { title: 'Nouvelle offre — Espace Recruteur' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const ctx = await getRecruteurContext(session.cjsUid)
  const [skills, programmes] = await Promise.all([
    prisma.skill.findMany({ select: { id: true, libelle: true }, orderBy: { libelle: 'asc' } }),
    loadProgrammeOptions(prisma),
  ])

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="mb-6">
        <Link href="/recruteur/mes-offres" className="inline-flex items-center gap-[6px] text-[12.5px] font-bold no-underline mb-[8px]" style={{ color: 'var(--gj-blue-ink, #1A3FA8)' }}>
          <Icon name="chevron-left" size={14} /> Mes offres
        </Link>
        <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Nouvelle offre</h1>
        <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
          Publiez une offre — elle sera validée par l&apos;équipe CJS avant mise en ligne.
        </p>
      </div>

      {!ctx.organisationId || !ctx.organisationNom ? (
        <div className="rounded-[14px] p-[24px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
          <p className="text-[14px] font-bold">Aucune organisation n&apos;est associée à votre compte.</p>
          <p className="text-[12.5px] mt-[4px]">Contactez l&apos;équipe CJS pour rattacher votre entreprise avant de publier une offre.</p>
        </div>
      ) : (
        <NouvelleOffreForm companyName={ctx.organisationNom} skills={skills} programmes={programmes} />
      )}
    </div>
  )
}
