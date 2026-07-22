import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getRecruteurContext, getRecruteurPipeline, type PipelineFiltres } from '@/lib/loaders/recruteur'
import { Icon } from '@/components/ui/Icon'
import { PipelineBoard } from './PipelineBoard'
import { FiltresPanneau } from './FiltresPanneau'
import { RefuseesZone } from './RefuseesZone'

export const metadata: Metadata = { title: 'Candidatures — Espace Recruteur' }
export const dynamic = 'force-dynamic'

type SP = Record<string, string | undefined>

/** Entier positif depuis l'URL — sinon undefined (fail-soft). */
function num(v: string | undefined): number | undefined {
  const n = v ? parseInt(v, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** GUIC-647 — traduit les query params en filtres avancés du pipeline. */
function filtresFromParams(sp: SP): PipelineFiltres {
  return {
    q: sp.q?.trim() || undefined,
    region: sp.region?.trim() || undefined,
    commune: sp.commune?.trim() || undefined,
    genre: sp.genre === 'M' || sp.genre === 'F' ? sp.genre : undefined,
    ageMin: num(sp.ageMin),
    ageMax: num(sp.ageMax),
    niveau: sp.niveau?.trim() || undefined,
    situation: sp.situation?.trim() || undefined,
    competence: sp.competence?.trim() || undefined,
    scoreMin: num(sp.scoreMin),
    favoris: sp.favoris === '1' || undefined,
    depuisJours: num(sp.depuis),
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const sp = await searchParams
  const filtres = filtresFromParams(sp)
  const ctx = await getRecruteurContext(session.cjsUid)
  const pipeline = await getRecruteurPipeline(session.cjsUid, ctx.organisationId, sp.offre, filtres)

  // GUIC-647 — le « restant » ne compte que le pipeline actif (refusées exclues).
  const total = (Object.values(pipeline.colonnes) as { length: number }[]).reduce((n, c) => n + c.length, 0)

  const exportParams = new URLSearchParams()
  if (pipeline.offreActiveId) exportParams.set('offre', pipeline.offreActiveId)
  if (filtres.q) exportParams.set('q', filtres.q)
  const exportHref = `/api/recruteur/candidatures/export${exportParams.toString() ? `?${exportParams}` : ''}`

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Candidatures</h1>
          <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>{total} candidat{total > 1 ? 's' : ''} dans le pipeline · glissez une carte pour changer d&apos;étape</p>
        </div>
        {total > 0 && (
          <a href={exportHref} className="inline-flex items-center gap-[7px] font-bold text-[13px] rounded-[10px] px-[16px] min-h-[44px] no-underline" style={{ color: 'var(--gj-blue-ink, #1A3FA8)', border: '1.5px solid var(--gj-blue, #1A4ED8)' }}>
            <Icon name="download" size={15} /> Exporter (CSV)
          </a>
        )}
      </div>

      <FiltresPanneau sp={sp} />

      {filtres.q && (
        <div className="flex items-center gap-[10px] rounded-[12px] px-[14px] py-[10px] mb-4" style={{ background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>
          <Icon name="search" size={15} />
          <span className="text-[12.5px] font-bold flex-1">Résultats pour « {filtres.q} »</span>
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
        <>
          <PipelineBoard pipeline={pipeline} />
          <RefuseesZone refusees={pipeline.refusees} />
        </>
      )}
    </div>
  )
}
