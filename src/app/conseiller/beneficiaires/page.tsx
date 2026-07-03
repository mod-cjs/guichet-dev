import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getConseillerContext, getCentreBeneficiaires, type BenefListItem } from '@/lib/loaders/conseiller'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProfilRing } from './profil-ring'

export const dynamic = 'force-dynamic'

/**
 * GUIC-499 — US-7 · Annuaire des bénéficiaires du centre + recherche.
 * Recherche server-driven via `?q=` (la barre du topbar pointe ici). Rendu
 * fidèle à `design-guichet-v4/agent-web.jsx` (AgentBenefList) : tableau
 * avatar + méta, commune, dernière visite, anneau de complétion, statut.
 * Chaque ligne ouvre la fiche détaillée du bénéficiaire.
 */

const COLS = 'grid-cols-[2.2fr_1.1fr_1.2fr_0.7fr_1fr_0.3fr]'

function BenefRow({ b }: { b: BenefListItem }) {
  return (
    <Link
      href={`/conseiller/beneficiaires/${b.cjsUid}`}
      className={`grid ${COLS} gap-space-3 items-center px-space-4 py-space-3 no-underline hover:bg-gj-bg transition-colors`}
      style={{ borderBottom: '1px solid var(--gj-line)' }}
    >
      <div className="flex items-center gap-space-3 min-w-0">
        <span className="inline-flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', fontWeight: 900, fontSize: 12 }}>
          {b.initials}
        </span>
        <div className="min-w-0">
          <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13.5 }}>{b.name}</div>
          <div className="text-color-text-secondary truncate" style={{ fontSize: 11 }}>
            {[b.age ? `${b.age} ans` : null, b.niveau, `${b.candidatures} candidature${b.candidatures > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <span className="text-color-text-primary truncate" style={{ fontSize: 12.5 }}>{b.commune}</span>
      <span className="text-color-text-secondary truncate" style={{ fontSize: 12.5 }}>{b.lastVisitLabel}</span>
      <ProfilRing pct={b.completion} />
      <span>
        <span className="inline-flex font-extrabold" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: b.statutTone === 'green' ? 'var(--gj-green-soft)' : 'var(--gj-yellow-soft)', color: b.statutTone === 'green' ? 'var(--gj-green-ink)' : 'var(--gj-yellow-ink)' }}>
          {b.statutLabel}
        </span>
      </span>
      <Icon name="chevron-right" size={16} style={{ color: 'var(--gj-grey-2, var(--gj-grey))', justifySelf: 'end' }} />
    </Link>
  )
}

export default async function ConseillerBeneficiairesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const sp = (await searchParams) ?? {}
  const q = (sp.q ?? '').trim()
  const { total, items } = await getCentreBeneficiaires(ctx.centreId, q || undefined)

  return (
    <div className="flex flex-col gap-space-4">
      <div>
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Bénéficiaires</h1>
        <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>
          {total} jeune{total > 1 ? 's' : ''} rattaché{total > 1 ? 's' : ''} à {ctx.centreNom}.
        </p>
      </div>

      {/* Recherche (US-7) — server-driven ?q= */}
      <form action="/conseiller/beneficiaires" method="get" role="search" className="flex items-center gap-space-2" style={{ background: '#fff', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 14px', minHeight: 44, maxWidth: 420 }}>
        <Icon name="search" size={16} style={{ color: 'var(--gj-grey)' }} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un bénéficiaire…"
          aria-label="Rechercher un bénéficiaire"
          className="flex-1 bg-transparent outline-none text-fs-300"
          style={{ border: 0, color: 'var(--gj-ink)' }}
        />
      </form>

      {items.length === 0 ? (
        <EmptyState icon="users" title={q ? 'Aucun résultat' : 'Aucun bénéficiaire'} description={q ? `Aucun bénéficiaire ne correspond à « ${q} ».` : 'Les jeunes ayant fréquenté le centre apparaîtront ici.'} />
      ) : (
        <div className="bg-white" style={{ border: '1.5px solid var(--gj-line)', borderRadius: 14, overflow: 'hidden' }}>
          <div className={`grid ${COLS} gap-space-3 px-space-4 py-space-3`} style={{ borderBottom: '1.5px solid var(--gj-line)', background: 'var(--gj-bg)', fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            <span>Bénéficiaire</span><span>Commune</span><span>Dernière visite</span><span>Profil</span><span>Statut</span><span></span>
          </div>
          {items.map((b) => <BenefRow key={b.cjsUid} b={b} />)}
        </div>
      )}
    </div>
  )
}
