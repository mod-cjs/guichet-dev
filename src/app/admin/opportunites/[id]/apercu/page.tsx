import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getOpportuniteDetailForAdmin } from '@/lib/opportunites-loader'
import { OpportuniteDetail } from '@/components/opportunites/OpportuniteDetail'
import { Alert } from '@/components/ui/Alert'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = { title: 'Aperçu modération — Admin CJS' }

/**
 * MOD-01 — Aperçu admin d'une opportunité en attente de modération.
 * Charge le brouillon SANS filtre de statut (la page publique ne l'affiche pas)
 * pour que l'admin voie le contenu AVANT d'approuver/rejeter. Garde admin + viewer
 * null (pas de CTA candidature en aperçu).
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const { id } = await params
  const detail = await getOpportuniteDetailForAdmin(id)
  if (!detail) notFound()

  return (
    <div className="container-page py-space-6 max-w-[var(--gj-container-md)]">
      <Link
        href="/admin/opportunites"
        className="inline-flex items-center gap-[6px] text-fs-200 font-bold text-gj-teal-deep hover:underline mb-space-3"
      >
        <Icon name="chevron-left" size={15} />
        Retour à la file de modération
      </Link>

      <Alert type="warning" title="Aperçu de modération">
        Cette publication n’est pas encore en ligne. Vérifiez son contenu avant de
        l’approuver ou de la rejeter depuis la file de modération.
      </Alert>

      <div className="mt-space-3">
        <OpportuniteDetail detail={detail} viewer={null} />
      </div>
    </div>
  )
}
