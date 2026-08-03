import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { getOpportuniteDetailForAdmin } from '@/lib/opportunites-loader'
import { Icon } from '@/components/ui/Icon'
import { OpportuniteForm, type OpportuniteFormInitial } from '../../OpportuniteForm'
import { loadFormTypes } from '../../form-types'
import { loadProgrammeOptions } from '@/lib/programmes/options'

export const metadata: Metadata = { title: 'Modifier l’opportunité — Admin CJS' }

/** Aplati le sous-type (payload discriminé) en valeurs de formulaire (strings/booléens). */
function flattenDetails(
  details: { payload: Record<string, unknown> } | null,
): Record<string, string | boolean> {
  if (!details) return {}
  const out: Record<string, string | boolean> = {}
  for (const [k, v] of Object.entries(details.payload)) {
    if (v == null) out[k] = ''
    else if (v instanceof Date) out[k] = v.toISOString().slice(0, 10)
    else if (typeof v === 'boolean') out[k] = v
    else out[k] = String(v)
  }
  return out
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const { id } = await params
  const [detail, types, programmes] = await Promise.all([
    getOpportuniteDetailForAdmin(id),
    loadFormTypes(prisma),
    loadProgrammeOptions(prisma),
  ])
  if (!detail) notFound()

  const initial: OpportuniteFormInitial = {
    id,
    type: detail.typeSlug ?? undefined,
    base: {
      titre: detail.titre,
      slug: detail.slug,
      description: detail.description,
      mission: detail.mission,
      profilRecherche: detail.profilRecherche,
      conditions: detail.conditions,
      organisationLibelle: detail.organisation,
      domaine: detail.domaine,
      region: detail.region,
      remuneration: detail.remuneration,
      deadline: detail.deadline ? detail.deadline.slice(0, 10) : null,
      lienExterne: detail.lienExterne,
      statut: detail.statut,
    },
    details: flattenDetails(detail.details),
    // GUIC-684 — rattachements existants ; vide pour un contenu antérieur au ticket,
    // l'admin devra alors en choisir un avant de pouvoir enregistrer.
    programmeSlugs: detail.programmes.map((p) => p.slug),
    programmePrincipalSlug: detail.programme?.slug ?? null,
  }

  return (
    <div className="container-page py-space-6 max-w-[var(--gj-container-md)]">
      <Link
        href="/admin/opportunites/gestion"
        className="inline-flex items-center gap-[6px] text-fs-200 font-bold text-gj-teal-deep hover:underline mb-space-3"
      >
        <Icon name="chevron-left" size={15} />
        Retour à la gestion
      </Link>
      <h1 className="text-fs-500 font-black text-color-text-primary mb-space-4">Modifier « {detail.titre} »</h1>
      <OpportuniteForm types={types} programmes={programmes} initial={initial} />
    </div>
  )
}
