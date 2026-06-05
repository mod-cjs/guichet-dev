import type { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import {
  CarteCjsHero,
  RdvCard,
  CentresMap,
  CentreListItem,
  AtelierCarousel,
  // TODO(GUIC-235) — modèles Prisma RDV/Atelier inexistants, mocks conservés.
  MOCK_RDV,
  MOCK_ATELIERS,
} from '@/components/centres'
import { listCentres } from '@/lib/loaders/centres'
import { EmptyState } from '@/components/ui'

export const metadata: Metadata = { title: 'Centres CJS' }

export default async function Page() {
  const session = await getSession()
  const userName = session ? `${session.prenom} ${session.nom}`.trim() : null
  const centres = await listCentres()
  const memberId = session
    ? `GJS · ${(session.prenom?.[0] ?? '?').toUpperCase()}${(session.nom?.[0] ?? '?').toUpperCase()} · ${session.cjsUid.slice(0, 6)}`
    : undefined

  if (centres.length === 0) {
    return (
      <div className="bg-gj-bg min-h-[100dvh] flex items-center justify-center p-space-4">
        <EmptyState
          title="Aucun centre disponible"
          description="Les centres CJS seront bientôt accessibles ici."
        />
      </div>
    )
  }

  const primary = centres.find((c) => c.isPrimary) ?? centres[0]
  const ateliers = MOCK_ATELIERS.filter((a) => a.centreId === primary.id)
  const orderedCentres = [primary, ...centres.filter((c) => c.id !== primary.id)]

  return (
    <div className="bg-gj-bg min-h-[100dvh] pb-space-6">
      {/* MOBILE (< lg) — layout vertical historique */}
      <div className="lg:hidden mx-auto max-w-screen-sm">
        <div className="pt-space-3 px-space-3">
          <CarteCjsHero userName={userName} memberId={memberId} cjsUid={session?.cjsUid} centre={primary.nom} />
        </div>

        <div className="mt-space-3 px-space-3">
          <RdvCard rdv={MOCK_RDV} />
        </div>

        <div className="mt-space-3 px-space-3">
          <CentresMap centres={centres} highlightId={primary.id} />
        </div>

        <h2 className="text-fs-100 font-black text-gj-grey uppercase tracking-wide px-space-3 pt-space-4 pb-space-2">
          Près de toi
        </h2>
        <div className="flex flex-col gap-space-2 px-space-3">
          {orderedCentres.slice(0, 3).map((c) => (
            <CentreListItem key={c.id} centre={c} />
          ))}
        </div>

        <h2 className="text-fs-100 font-black text-gj-grey uppercase tracking-wide px-space-3 pt-space-4 pb-space-2">
          Ateliers à mon centre
        </h2>
        <div className="px-space-3">
          <AtelierCarousel ateliers={ateliers} />
        </div>
      </div>

      {/* DESKTOP (≥ lg) — layout 2 colonnes */}
      <div className="hidden lg:grid mx-auto max-w-screen-xl gap-space-4 px-space-4 pt-space-4 lg:grid-cols-[1fr_400px]">
        {/* Colonne gauche : carte élargie + grille de centres */}
        <div className="flex flex-col gap-space-4 min-w-0">
          <CentresMap centres={centres} highlightId={primary.id} variant="desktop" />

          <section>
            <h2 className="text-fs-100 font-black text-gj-grey uppercase tracking-wide pb-space-2">
              Près de toi
            </h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-3">
              {orderedCentres.map((c) => (
                <CentreListItem key={c.id} centre={c} />
              ))}
            </div>
          </section>
        </div>

        {/* Colonne droite sticky : carte CJS + RDV + ateliers */}
        <aside className="flex flex-col gap-space-3 lg:sticky lg:top-space-4 lg:self-start">
          <CarteCjsHero userName={userName} memberId={memberId} cjsUid={session?.cjsUid} centre={primary.nom} />
          <RdvCard rdv={MOCK_RDV} />
          <section>
            <h2 className="text-fs-100 font-black text-gj-grey uppercase tracking-wide pb-space-2">
              Ateliers à mon centre
            </h2>
            <AtelierCarousel ateliers={ateliers} />
          </section>
        </aside>
      </div>
    </div>
  )
}
