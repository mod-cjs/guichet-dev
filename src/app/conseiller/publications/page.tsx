import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getConseillerContext, getPublicationsCentre, type PublicationItem } from '@/lib/loaders/conseiller'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { NouvellePublication } from './publications-client'

export const dynamic = 'force-dynamic'

/**
 * GUIC-477 — Publications du conseiller : liste des événements du centre + création.
 * (La validation admin préalable nécessitera une extension de StatutEvenement.)
 */
const TONE: Record<PublicationItem['statutTone'], [string, string]> = {
  teal: ['var(--gj-teal-soft)', 'var(--gj-teal-deep)'],
  green: ['var(--gj-green-soft)', 'var(--gj-green-ink)'],
  yellow: ['var(--gj-yellow-soft)', 'var(--gj-yellow-ink)'],
  grey: ['var(--gj-bg)', 'var(--gj-grey)'],
  red: ['var(--gj-red-soft)', 'var(--gj-red-ink)'],
}

export default async function ConseillerPublicationsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const publications = await getPublicationsCentre(ctx.centreId)

  return (
    <div className="flex flex-col gap-space-4" style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="flex items-end justify-between gap-space-3 flex-wrap">
        <div>
          <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Publications</h1>
          <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>
            Ateliers, formations et événements de {ctx.centreNom}.
          </p>
        </div>
        <NouvellePublication />
      </div>

      {publications.length === 0 ? (
        <EmptyState icon="employment" title="Aucune publication" description="Créez votre première publication (atelier, formation, événement) pour votre centre." />
      ) : (
        <div className="bg-white rounded-gj-lg overflow-hidden" style={{ border: '1.5px solid var(--gj-line)' }}>
          {publications.map((p) => (
            <div key={p.id} className="flex items-center gap-space-3 px-space-4 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
              <span className="inline-flex items-center justify-center shrink-0 rounded-gj-md" style={{ width: 42, height: 42, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
                <Icon name="employment" size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 14 }}>{p.titre}</div>
                <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5, marginTop: 1 }}>
                  {p.type} · {p.dateLabel}
                  {p.capacite != null ? ` · ${p.inscriptions}/${p.capacite} inscrits` : ` · ${p.inscriptions} inscrits`}
                </div>
              </div>
              <span className="inline-flex font-extrabold shrink-0" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: TONE[p.statutTone][0], color: TONE[p.statutTone][1] }}>
                {p.statutLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
