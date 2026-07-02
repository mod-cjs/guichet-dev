import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { Icon } from '@/components/ui/Icon'
import { getRecruteurContext, getRecruteurOffres } from '@/lib/loaders/recruteur'

export const metadata: Metadata = { title: 'Mes offres — Espace Recruteur' }

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon', publiee: 'Publiée', archivee: 'Archivée', expiree: 'Expirée',
}

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const ctx = await getRecruteurContext(session.cjsUid)
  const offres = await getRecruteurOffres(session.cjsUid, ctx.organisationId)

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <div className="mb-6">
        <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Mes offres</h1>
        <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>{offres.length} offre{offres.length > 1 ? 's' : ''}</p>
      </div>

      {offres.length === 0 ? (
        <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
          <p className="text-[14px] font-bold">Aucune offre pour le moment.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {offres.map((o) => (
            <div key={o.id} className="rounded-[14px] p-[16px] flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
              <div className="min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>{STATUT_LABEL[o.statut] ?? o.statut}</span>
                  <span className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>{o.titre}</span>
                </div>
                <p className="text-[12.5px] mt-[4px]" style={{ color: 'var(--gj-grey)' }}>{o.candidatures} candidature{o.candidatures > 1 ? 's' : ''} · {o.vues} vues</p>
              </div>
              <Link href={`/admin/opportunites/${o.id}/apercu`} className="inline-flex items-center gap-[6px] font-bold text-[12.5px] rounded-[9px] px-[14px] py-[8px] min-h-[44px] no-underline" style={{ background: 'var(--gj-surface)', color: 'var(--gj-blue-ink, #1A3FA8)', border: '1.5px solid var(--gj-blue, #1A4ED8)' }}>
                <Icon name="eye" size={14} /> Aperçu
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
