import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getConseillerContext, getPublicationsCentre, type PublicationItem } from '@/lib/loaders/conseiller'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'

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
const KIND_TONE: Record<PublicationItem['kindTone'], [string, string]> = {
  teal: ['var(--gj-teal-soft)', 'var(--gj-teal-deep)'],
  blue: ['var(--gj-blue-soft)', 'var(--gj-blue-ink)'],
  yellow: ['var(--gj-yellow-soft)', 'var(--gj-yellow-ink)'],
  green: ['var(--gj-green-soft)', 'var(--gj-green-ink)'],
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
        <Link href="/conseiller/publications/nouvelle" className="inline-flex items-center gap-space-2 no-underline font-extrabold" style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "10px 16px", borderRadius: 10, fontSize: 13 }}><Icon name="plus" size={15} /> Nouvelle publication</Link>
      </div>

      {publications.length === 0 ? (
        <EmptyState icon="employment" title="Aucune publication" description="Créez votre première publication (atelier, formation, événement) pour votre centre." />
      ) : (
        <div className="grid gap-space-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {publications.map((p) => (
            <div key={p.id} className="bg-white rounded-gj-lg p-space-4 flex flex-col gap-space-2" style={{ border: '1px solid var(--gj-line)' }}>
              <div className="flex items-center gap-space-2">
                <span className="font-extrabold uppercase" style={{ fontSize: 9.5, letterSpacing: '.3px', color: KIND_TONE[p.kindTone][1], background: KIND_TONE[p.kindTone][0], padding: '3px 8px', borderRadius: 999 }}>{p.type}</span>
                <span className="font-extrabold ml-auto" style={{ fontSize: 9.5, background: TONE[p.statutTone][0], color: TONE[p.statutTone][1], padding: '3px 8px', borderRadius: 999 }}>{p.statutLabel}</span>
              </div>
              <div className="font-extrabold text-color-text-primary" style={{ fontSize: 14, lineHeight: 1.25 }}>{p.titre}</div>
              <div className="text-color-text-secondary" style={{ fontSize: 11.5 }}>
                {p.dateLabel}
                {p.capacite != null ? ` · ${p.inscriptions}/${p.capacite} places` : p.inscriptions ? ` · ${p.inscriptions} inscrits` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
