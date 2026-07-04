import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getConseillerContext, getCentreBeneficiaires, type BenefListItem, type BenefStatutFilter } from '@/lib/loaders/conseiller'
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

function StatutPill({ b }: { b: BenefListItem }) {
  return (
    <span className="inline-flex font-extrabold" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: b.statutTone === 'green' ? 'var(--gj-green-soft)' : 'var(--gj-yellow-soft)', color: b.statutTone === 'green' ? 'var(--gj-green-ink)' : 'var(--gj-yellow-ink)' }}>
      {b.statutLabel}
    </span>
  )
}

function BenefRow({ b }: { b: BenefListItem }) {
  const metaLine = [b.age ? `${b.age} ans` : null, b.niveau, `${b.candidatures} candidature${b.candidatures > 1 ? 's' : ''}`].filter(Boolean).join(' · ')
  return (
    <Link
      href={`/conseiller/beneficiaires/${b.cjsUid}`}
      className="block no-underline hover:bg-gj-bg transition-colors"
      style={{ borderBottom: '1px solid var(--gj-line)' }}
    >
      {/* Desktop : tableau */}
      <div className={`hidden md:grid ${COLS} gap-space-3 items-center px-space-4 py-space-3`}>
        <div className="flex items-center gap-space-3 min-w-0">
          <span className="inline-flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', fontWeight: 900, fontSize: 12 }}>{b.initials}</span>
          <div className="min-w-0">
            <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13.5 }}>{b.name}</div>
            <div className="text-color-text-secondary truncate" style={{ fontSize: 11 }}>{metaLine}</div>
          </div>
        </div>
        <span className="text-color-text-primary truncate" style={{ fontSize: 12.5 }}>{b.commune}</span>
        <span className="text-color-text-secondary truncate" style={{ fontSize: 12.5 }}>{b.lastVisitLabel}</span>
        <ProfilRing pct={b.completion} />
        <span><StatutPill b={b} /></span>
        <Icon name="chevron-right" size={16} style={{ color: 'var(--gj-grey-2, var(--gj-grey))', justifySelf: 'end' }} />
      </div>

      {/* Mobile : carte */}
      <div className="md:hidden flex items-center gap-space-3 px-space-4 py-space-3">
        <span className="inline-flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', fontWeight: 900, fontSize: 13 }}>{b.initials}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-space-2">
            <span className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 14 }}>{b.name}</span>
            <StatutPill b={b} />
          </div>
          <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5, marginTop: 1 }}>{metaLine}</div>
          <div className="text-color-text-secondary truncate" style={{ fontSize: 11, marginTop: 1 }}>{b.commune} · vu {b.lastVisitLabel}</div>
        </div>
        <ProfilRing pct={b.completion} />
        <Icon name="chevron-right" size={16} className="shrink-0" style={{ color: 'var(--gj-grey-2, var(--gj-grey))' }} />
      </div>
    </Link>
  )
}

const FILTERS: { id: BenefStatutFilter; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'actif', label: 'Actifs' },
  { id: 'incomplet', label: 'À compléter' },
]
function parseStatut(v?: string): BenefStatutFilter {
  return v === 'actif' || v === 'incomplet' ? v : 'tous'
}

export default async function ConseillerBeneficiairesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; statut?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const sp = (await searchParams) ?? {}
  const q = (sp.q ?? '').trim()
  const statut = parseStatut(sp.statut)
  const { total, items } = await getCentreBeneficiaires(ctx.centreId, q || undefined, statut)
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (statut !== 'tous') p.set('statut', statut)
    for (const [k, v] of Object.entries(extra)) { if (v) p.set(k, v); else p.delete(k) }
    const s = p.toString()
    return s ? `?${s}` : ''
  }

  return (
    <div className="flex flex-col gap-space-4">
      <div>
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Bénéficiaires</h1>
        <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>
          {total} jeune{total > 1 ? 's' : ''} rattaché{total > 1 ? 's' : ''} à {ctx.centreNom}.
        </p>
      </div>

      {/* Barre d'outils : recherche + filtre statut + export */}
      <div className="flex items-center gap-space-3 flex-wrap justify-between">
        <form action="/conseiller/beneficiaires" method="get" role="search" className="flex items-center gap-space-2" style={{ background: '#fff', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 14px', minHeight: 44, width: 340, maxWidth: '100%' }}>
          <Icon name="search" size={16} style={{ color: 'var(--gj-grey)' }} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher un bénéficiaire…"
            aria-label="Rechercher un bénéficiaire"
            className="flex-1 bg-transparent outline-none text-fs-300"
            style={{ border: 0, color: 'var(--gj-ink)' }}
          />
          {statut !== 'tous' && <input type="hidden" name="statut" value={statut} />}
        </form>

        <div className="flex items-center gap-space-3 flex-wrap">
          {/* Filtre statut */}
          <div className="flex gap-space-1 bg-white" style={{ border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: 4 }} role="group" aria-label="Filtrer par statut">
            {FILTERS.map((f) => {
              const on = f.id === statut
              return (
                <Link key={f.id} href={`/conseiller/beneficiaires${qs({ statut: f.id === 'tous' ? '' : f.id })}`} aria-pressed={on} className="no-underline font-extrabold" style={{ padding: '7px 12px', borderRadius: 7, fontSize: 12, background: on ? 'var(--gj-teal-deep)' : 'transparent', color: on ? '#fff' : 'var(--gj-grey)' }}>
                  {f.label}
                </Link>
              )
            })}
          </div>
          {/* Export CSV */}
          <a href={`/conseiller/beneficiaires/export${qs({})}`} className="inline-flex items-center gap-space-2 no-underline font-extrabold" style={{ background: '#fff', border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)', padding: '9px 14px', borderRadius: 9, fontSize: 12.5 }}>
            <Icon name="download" size={15} /> Exporter
          </a>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="users" title={q ? 'Aucun résultat' : 'Aucun bénéficiaire'} description={q ? `Aucun bénéficiaire ne correspond à « ${q} ».` : 'Les jeunes ayant fréquenté le centre apparaîtront ici.'} />
      ) : (
        <div className="bg-white" style={{ border: '1.5px solid var(--gj-line)', borderRadius: 14, overflow: 'hidden' }}>
          <div className={`hidden md:grid ${COLS} gap-space-3 px-space-4 py-space-3`} style={{ borderBottom: '1.5px solid var(--gj-line)', background: 'var(--gj-bg)', fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            <span>Bénéficiaire</span><span>Commune</span><span>Dernière visite</span><span>Profil</span><span>Statut</span><span></span>
          </div>
          {items.map((b) => <BenefRow key={b.cjsUid} b={b} />)}
        </div>
      )}
    </div>
  )
}
