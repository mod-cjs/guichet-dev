import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { conseillerSansRattachement } from '@/lib/auth/espace-guards'
import { getConseillerContext, getCheckinsDuJour } from '@/lib/loaders/conseiller'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { CheckinScanner } from './checkin-scanner'

export const dynamic = 'force-dynamic'

/**
 * GUIC-498 — US-6 · Check-in présence du jour.
 * Réutilise le modèle `CheckIn` (scanner GUIC-387). Le scan se fait avec
 * l'appareil photo sur le QR de la carte CJS du jeune, qui ouvre la page de
 * confirmation `/checkin/v1/<jeton>`. Cette page liste la présence du jour.
 */
export default async function ConseillerCheckinPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return conseillerSansRattachement(session.roles)

  const checkins = await getCheckinsDuJour(ctx.centreId)

  return (
    <div className="flex flex-col gap-space-4">
      <div>
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Check-in présence</h1>
        <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>
          Présence du jour à {ctx.centreNom}.
        </p>
      </div>

      {/* Scanner QR in-app (caméra + BarcodeDetector, repli saisie manuelle) */}
      <CheckinScanner />

      <div className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
        <div className="flex items-center justify-between mb-space-3">
          <h2 className="font-black text-color-text-primary m-0" style={{ fontSize: 16 }}>
            Présents aujourd&apos;hui
          </h2>
          <span className="inline-flex items-center gap-space-1 font-extrabold" style={{ fontSize: 12, background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)', padding: '3px 10px', borderRadius: 999 }}>
            <Icon name="check-circle" size={13} /> {checkins.length}
          </span>
        </div>

        {checkins.length === 0 ? (
          <EmptyState icon="target" title="Aucune présence enregistrée" description="Les check-ins du jour apparaîtront ici au fil des scans." />
        ) : (
          <div className="flex flex-col">
            {checkins.map((c) => (
              <div key={c.id} className="flex items-center gap-space-3 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
                <span className="inline-flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', fontWeight: 900, fontSize: 12 }}>
                  {c.initials}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13.5 }}>{c.who}</div>
                  <div className="text-color-text-secondary" style={{ fontSize: 11.5 }}>Arrivé·e à {c.time} · {c.via}</div>
                </div>
                <Icon name="check-circle" size={18} style={{ color: 'var(--gj-green)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
