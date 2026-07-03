import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/** Paramètres du conseiller — à venir. Affiche déjà le rattachement centre. */
export default async function ConseillerParametresPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

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
            <div className="text-fs-200 text-color-text-secondary truncate">Rattaché à {ctx.centreNom}</div>
          </div>
        </div>
      </div>

      <EmptyState
        icon="settings"
        title="Réglages à venir"
        description="La gestion des préférences (notifications, disponibilités, centre actif) sera disponible prochainement."
      />
    </div>
  )
}
