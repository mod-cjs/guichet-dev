import type { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import {
  CarteCjsHero,
  RdvCard,
  CentresMap,
  CentreListItem,
  AtelierCarousel,
  MOCK_CENTRES,
  MOCK_RDV,
  MOCK_ATELIERS,
} from '@/components/centres'

export const metadata: Metadata = { title: 'Centres CJS' }

export default async function Page() {
  const session = await getSession()
  const userName = session ? `${session.prenom} ${session.nom}`.trim() : null
  const centres = MOCK_CENTRES
  const primary = centres.find((c) => c.isPrimary) ?? centres[0]
  const ateliers = MOCK_ATELIERS.filter((a) => a.centreId === primary.id)
  const memberId = session
    ? `GJS · ${(session.prenom?.[0] ?? '?').toUpperCase()}${(session.nom?.[0] ?? '?').toUpperCase()} · ${session.cjsUid.slice(0, 6)}`
    : undefined

  return (
    <div className="mx-auto max-w-screen-sm pb-space-6 bg-gj-bg min-h-[100dvh]">
      <div className="pt-space-3 px-space-3">
        <CarteCjsHero userName={userName} memberId={memberId} centre={primary.nom} />
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
        {[primary, ...centres.filter((c) => c.id !== primary.id).slice(0, 2)].map((c) => (
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
  )
}
