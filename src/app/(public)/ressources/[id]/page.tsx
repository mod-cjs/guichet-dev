import type { Metadata } from 'next'
import Link from 'next/link'
import { after } from 'next/server'
import { notFound } from 'next/navigation'
import { getRessourceById, getRessourcesRelated } from '@/lib/loaders/ressources'
import { getSession } from '@/lib/auth'
import { trackVuePage } from '@/lib/analytics/consultation-server'
import { RessourceDetailHero } from '@/components/ressources/RessourceDetailHero'
import { RessourceRelatedList } from '@/components/ressources/RessourceRelatedList'
import { Breadcrumbs } from '@/components/ui'
import { RessourceDetailClient } from './ressource-detail-client'
import { htmlToPlainText } from '@/lib/rich-html'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'
import { RessourceMetadonnees } from '@/components/ressources/RessourceMetadonnees'

/**
 * GUIC-363 — Page détail ressource publique.
 *
 * NB schéma : le modèle `Ressource` (prisma/schema.prisma) n'a pas de champ
 * `slug` — la route est paramétrée par `id` (UUID). À l'ajout d'un slug,
 * étendre `getRessourceById` pour accepter slug|id et garder la rétrocompat.
 */

export const dynamic = 'force-dynamic'

interface RessourceDetailPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ src?: string | string[]; from?: string | string[] }>
}

export async function generateMetadata({
  params,
}: RessourceDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const detail = await getRessourceById(id)
  if (!detail) return { title: 'Ressource introuvable', robots: { index: false } }
  const description = htmlToPlainText(detail.description).slice(0, 160)
  const canonical = `/ressources/${id}`
  return {
    title: detail.titre,
    description,
    alternates: { canonical },
    openGraph: { title: detail.titre, description, url: canonical, type: 'article' },
  }
}

export default async function RessourceDetailPage({ params, searchParams }: RessourceDetailPageProps) {
  const { id } = await params
  const detail = await getRessourceById(id)
  if (!detail) notFound()

  const related = await getRessourcesRelated(detail.id, 3)

  // GUIC-688 — passe par le socle commun : ajoute au passage la garde de
  // dédoublonnage 30 min qui manquait ici (le compteur montait à chaque rendu).
  const session = await getSession()
  const sp = (await searchParams) ?? {}
  after(() => trackVuePage({
    typeEntite: 'ressource',
    entiteId:   detail.id,
    src:        sp.src,
    from:       sp.from,
    cjsUid:     session?.cjsUid ?? null,
  }))

  const pageUrl = `/ressources/${detail.id}`

  // GUIC-25 (M7 SEO) — fil d'Ariane structuré
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Accueil', path: '/' },
    { name: 'Ressources', path: '/ressources' },
    { name: detail.titre, path: pageUrl },
  ])

  return (
    <div className="container-page py-space-6 max-w-[var(--gj-container-md)]">
      <JsonLd data={breadcrumb} />
      <Breadcrumbs
        className="mb-space-3"
        items={[
          { label: 'Accueil', href: '/' },
          { label: 'Ressources', href: '/ressources' },
          { label: detail.titre },
        ]}
      />
      {/* GUIC-689 — `vue=liste`, pas `/ressources` nu : sans filtre, la page rend
          l'accueil médiathèque et le lien ramènerait à un écran de départ, pas à
          la liste. Même défaut que celui corrigé sur l'accueil ; il a survécu
          parce que la sentinelle ne lisait qu'un seul fichier. */}
      <Link
        href="/ressources?vue=liste"
        className="lg:hidden text-fs-200 font-bold text-gj-teal-deep hover:underline"
      >
        ← Toutes les ressources
      </Link>

      <div className="mt-space-4 flex flex-col gap-space-5">
        <RessourceDetailHero detail={detail} />
        {/* GUIC-689 — la fiche n'affichait que le thème et un compteur de vues.
            On expose ce que la base porte réellement ; taille et pagination,
            attendues par la v5, n'existent pas au modèle et restent tues. */}
        <RessourceMetadonnees
          type={detail.type}
          langue={detail.langue}
          niveau={detail.niveau}
          theme={detail.theme}
          updatedAt={detail.updatedAt}
        />
        <RessourceDetailClient detail={detail} pageUrl={pageUrl} userIsConnected={Boolean(session)} />
        <RessourceRelatedList items={related} />
      </div>
    </div>
  )
}
