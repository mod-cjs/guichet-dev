import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { conseillerSansRattachement } from '@/lib/auth/espace-guards'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { Icon, type IconName } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/** Guide conseiller — aide contextuelle sur les sections de l'espace. */
const GUIDE: { icon: IconName; title: string; body: string; href: string }[] = [
  { icon: 'home', title: 'Tableau de bord', body: 'Vue d’ensemble : 4 indicateurs du centre, réservations à valider et agenda du jour.', href: '/conseiller' },
  { icon: 'calendar', title: 'Réservations', body: 'Validez les demandes de ressources : accepter, refuser avec motif, ou proposer un autre créneau. Le bénéficiaire est notifié.', href: '/conseiller/reservations' },
  { icon: 'clock', title: 'Agenda & RDV', body: 'Consultez l’activité en vue Jour, Semaine ou Mois. Les ateliers collectifs sont distingués des rendez-vous.', href: '/conseiller/agenda' },
  { icon: 'target', title: 'Check-in présence', body: 'Scannez le QR de la carte CJS du jeune (appareil photo) pour enregistrer sa présence. La liste du jour se met à jour.', href: '/conseiller/checkin' },
  { icon: 'users', title: 'Bénéficiaires', body: 'Annuaire des jeunes du centre : recherche, filtre par statut, export CSV, et fiche détaillée par bénéficiaire.', href: '/conseiller/beneficiaires' },
  { icon: 'chat', title: 'Messagerie', body: 'Échangez avec les bénéficiaires. Le badge indique les messages non lus.', href: '/conseiller/messagerie' },
]

export default async function ConseillerAidePage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return conseillerSansRattachement(session.roles)

  return (
    <div className="flex flex-col gap-space-4" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div>
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Centre d&apos;aide &amp; guide conseiller</h1>
        <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>Comment utiliser votre espace, section par section.</p>
      </div>

      <div className="grid gap-space-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {GUIDE.map((g) => (
          <Link key={g.href} href={g.href} className="no-underline bg-white rounded-gj-lg p-space-4 flex flex-col gap-space-2 hover:shadow-gj-md transition-shadow" style={{ border: '1.5px solid var(--gj-line)' }}>
            <span className="inline-flex items-center justify-center rounded-gj-md" style={{ width: 40, height: 40, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
              <Icon name={g.icon} size={20} />
            </span>
            <div className="font-extrabold text-color-text-primary" style={{ fontSize: 14 }}>{g.title}</div>
            <div className="text-color-text-secondary" style={{ fontSize: 12, lineHeight: 1.45 }}>{g.body}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-gj-lg p-space-4 flex items-center gap-space-3" style={{ border: '1.5px solid var(--gj-line)' }}>
        <span className="inline-flex items-center justify-center rounded-gj-md shrink-0" style={{ width: 42, height: 42, background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }}>
          <Icon name="help" size={21} />
        </span>
        <div className="text-color-text-secondary" style={{ fontSize: 12.5 }}>
          Besoin d&apos;aide ? Contactez l&apos;administrateur de votre programme via la messagerie ou le support CJS.
        </div>
      </div>
    </div>
  )
}
