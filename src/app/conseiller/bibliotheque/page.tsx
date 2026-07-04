import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { StatutEmprunt } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { getEmpruntsBibliotheque, getBibliothequeCounts, getBibliothequeStats } from '@/lib/loaders/conseiller-bibliotheque'
import { Icon } from '@/components/ui/Icon'
import { BibliothequeEmprunts } from './bibliotheque-client'

export const dynamic = 'force-dynamic'

/**
 * GUIC-521 — Bibliothèque conseiller (Phase B1) : emprunts du centre à confirmer /
 * à rendre / historique. Réemploi du service bibliothèque, scopé centre.
 */
type Tab = 'confirmer' | 'rendre' | 'historique'
const TABS: { id: Tab; label: string; statuts: StatutEmprunt[] }[] = [
  { id: 'confirmer', label: 'À confirmer', statuts: ['initie'] },
  { id: 'rendre', label: 'À rendre', statuts: ['en_cours', 'en_retard'] },
  { id: 'historique', label: 'Historique', statuts: ['rendu'] },
]

export default async function ConseillerBibliothequePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const sp = (await searchParams) ?? {}
  const active = TABS.find((t) => t.id === sp.tab) ?? TABS[0]

  const [items, counts, stats] = await Promise.all([
    getEmpruntsBibliotheque(ctx.centreId, active.statuts),
    getBibliothequeCounts(ctx.centreId),
    getBibliothequeStats(ctx.centreId),
  ])
  const badge: Record<Tab, number> = { confirmer: counts.confirmer, rendre: counts.rendre + counts.retard, historique: 0 }
  const STATS: { label: string; value: number; tone: string }[] = [
    { label: 'Titres', value: stats.titres, tone: 'var(--gj-teal-deep)' },
    { label: 'Exemplaires', value: stats.exemplaires, tone: 'var(--gj-teal-deep)' },
    { label: 'En cours', value: stats.enCours, tone: 'var(--gj-blue-ink)' },
    { label: 'À confirmer', value: stats.aConfirmer, tone: 'var(--gj-yellow-ink)' },
    { label: 'En retard', value: stats.enRetard, tone: 'var(--gj-red-ink)' },
  ]

  return (
    <div className="flex flex-col gap-space-4" style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="flex items-end justify-between gap-space-3 flex-wrap">
        <div>
          <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Bibliothèque</h1>
          <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>
            Emprunts de {ctx.centreNom}{counts.retard > 0 ? ` · ${counts.retard} en retard` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-space-2 flex-wrap">
          <Link href="/conseiller/bibliotheque/catalogue" className="inline-flex items-center gap-space-2 no-underline font-extrabold" style={{ background: '#fff', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-line)', padding: '9px 15px', borderRadius: 10, fontSize: 13 }}>
            <Icon name="learning" size={15} /> Catalogue
          </Link>
          <Link href="/conseiller/bibliotheque/comptoir" className="inline-flex items-center gap-space-2 no-underline font-extrabold" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
            <Icon name="target" size={15} /> Comptoir · Scanner
          </Link>
        </div>
      </div>

      {/* Indicateurs bibliothèque du centre (B4) */}
      <section aria-label="Indicateurs bibliothèque" className="grid gap-space-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white rounded-gj-lg p-space-3" style={{ border: '1.5px solid var(--gj-line)' }}>
            <div className="font-black" style={{ fontSize: 24, lineHeight: 1, color: s.tone }}>{s.value}</div>
            <div className="font-bold text-color-text-secondary" style={{ fontSize: 11.5, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-space-1 bg-white w-fit max-w-full" style={{ border: '1.5px solid var(--gj-line)', borderRadius: 12, padding: 5 }} role="tablist" aria-label="Filtrer les emprunts">
        {TABS.map((t) => {
          const on = t.id === active.id
          return (
            <Link key={t.id} href={`/conseiller/bibliotheque?tab=${t.id}`} role="tab" aria-selected={on} className="no-underline inline-flex items-center gap-space-2 font-extrabold" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, background: on ? 'var(--gj-teal-deep)' : 'transparent', color: on ? '#fff' : 'var(--gj-grey)' }}>
              {t.label}
              {badge[t.id] > 0 && <span className="font-extrabold" style={{ fontSize: 11, background: on ? 'rgba(255,255,255,.22)' : 'var(--gj-bg)', color: on ? '#fff' : 'var(--gj-grey)', padding: '1px 7px', borderRadius: 999 }}>{badge[t.id]}</span>}
            </Link>
          )
        })}
      </div>

      <BibliothequeEmprunts items={items} tab={active.id} />
    </div>
  )
}
