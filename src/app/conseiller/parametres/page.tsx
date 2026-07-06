import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { conseillerSansRattachement } from '@/lib/auth/espace-guards'
import { prisma } from '@/lib/prisma'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { Icon } from '@/components/ui/Icon'
import { ConseillerCentreSwitcher } from '@/components/layout/ConseillerCentreSwitcher'
import { ParametresNotifForm } from './ParametresNotifForm'

export const dynamic = 'force-dynamic'

/** Paramètres du conseiller : compte, centre actif, préférences de notification. */
export default async function ConseillerParametresPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return conseillerSansRattachement(session.roles)

  const prefs = await prisma.utilisateur.findUnique({
    where: { cjsUid: session.cjsUid },
    select: { notifCandidatures: true, notifMessages: true },
  })

  return (
    <div className="flex flex-col gap-space-4" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Paramètres</h1>

      <div className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
        <div className="flex items-center gap-space-3">
          <span className="inline-flex items-center justify-center shrink-0 rounded-gj-md" style={{ width: 44, height: 44, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
            <Icon name="pin" size={22} />
          </span>
          <div className="min-w-0">
            <div className="text-fs-200 text-color-text-secondary">Compte conseiller</div>
            <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 15 }}>{ctx.prenom} {ctx.nom}</div>
            <div className="text-fs-200 text-color-text-secondary truncate">Rôle : {ctx.role === 'conseiller' ? 'Conseiller' : ctx.role}</div>
          </div>
        </div>
      </div>

      {/* Centre actif (sélecteur si plusieurs rattachements) */}
      <div className="bg-white rounded-gj-lg p-space-5 flex items-center justify-between gap-space-3 flex-wrap" style={{ border: '1.5px solid var(--gj-line)' }}>
        <div>
          <div className="font-extrabold text-color-text-primary" style={{ fontSize: 14 }}>Centre actif</div>
          <div className="text-fs-200 text-color-text-secondary">
            {ctx.centres.length > 1 ? 'Vous êtes rattaché·e à plusieurs centres.' : 'Votre centre de rattachement.'}
          </div>
        </div>
        <ConseillerCentreSwitcher centres={ctx.centres} activeCentreId={ctx.centreId} variant="light" />
      </div>

      <ParametresNotifForm
        notifActivite={prefs?.notifCandidatures ?? true}
        notifMessages={prefs?.notifMessages ?? true}
      />
    </div>
  )
}
