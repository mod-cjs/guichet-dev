import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui/Icon'
import { OpportuniteForm } from '../OpportuniteForm'
import { SUBTYPE_SLUGS, loadFormTypes } from '../form-types'

export const metadata: Metadata = { title: 'Nouvelle opportunité — Admin CJS' }

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const types = await loadFormTypes(prisma)

  return (
    <div className="container-page py-space-6 max-w-[var(--gj-container-md)]">
      <Link
        href="/admin/opportunites/gestion"
        className="inline-flex items-center gap-[6px] text-fs-200 font-bold text-gj-teal-deep hover:underline mb-space-3"
      >
        <Icon name="chevron-left" size={15} />
        Retour à la gestion
      </Link>
      <h1 className="text-fs-500 font-black text-color-text-primary mb-space-4">Nouvelle opportunité</h1>
      <OpportuniteForm types={types.length ? types : SUBTYPE_SLUGS.map((s) => ({ slug: s, libelle: s }))} />
    </div>
  )
}
