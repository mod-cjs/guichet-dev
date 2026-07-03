import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getRecruteurContext, getRecruteurPipeline } from '@/lib/loaders/recruteur'
import { Icon } from '@/components/ui/Icon'
import { PipelineBoard } from './PipelineBoard'

export const metadata: Metadata = { title: 'Candidatures — Espace Recruteur' }
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ offre?: string; q?: string }> }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const ctx = await getRecruteurContext(session.cjsUid)
  const pipeline = await getRecruteurPipeline(session.cjsUid, ctx.organisationId, sp.offre, q)

  const total = (Object.values(pipeline.colonnes) as { length: number }[]).reduce((n, c) => n + c.length, 0)

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <div className="mb-4">
        <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Candidatures</h1>
        <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>{total} candidat{total > 1 ? 's' : ''} dans le pipeline · glissez une carte pour changer d&apos;étape</p>
      </div>

      {q && (
        <div className="flex items-center gap-[10px] rounded-[12px] px-[14px] py-[10px] mb-4" style={{ background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>
          <Icon name="search" size={15} />
          <span className="text-[12.5px] font-bold flex-1">Résultats pour « {q} »</span>
          <Link href="/recruteur/candidatures" className="text-[12px] font-black no-underline inline-flex items-center gap-[4px]" style={{ color: 'var(--gj-blue-ink, #1A3FA8)' }}>
            <Icon name="close" size={13} /> Effacer
          </Link>
        </div>
      )}

      {pipeline.offres.length === 0 ? (
        <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
          <p className="text-[14px] font-bold">Aucune offre — publiez une offre pour recevoir des candidatures.</p>
        </div>
      ) : (
        <PipelineBoard pipeline={pipeline} />
      )}
    </div>
  )
}
