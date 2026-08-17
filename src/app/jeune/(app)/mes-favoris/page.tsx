import { getSession } from '@/lib/auth'
import { estMasquee } from '@/lib/flags/ui-server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { MesFavoris } from '@/components/jeune/MesFavoris'
import { PageHeader } from '@/components/ui'

export const metadata: Metadata = { title: 'Mes sauvegardes' }

export default async function MesFavorisPage() {
  const session = await getSession()
  const ressourcesMasquees = await estMasquee('m6.ressources', session?.roles)
  return (
    <div>
      <PageHeader
        title="Mes sauvegardes"
        subtitle="Les opportunités que vous avez sauvegardées"
        actions={
          // GUIC-706 — ce raccourci nomme les ressources depuis la page des favoris :
          // surface d'incidence. Sans lui, la page reste cohérente ; avec lui sur un
          // module masqué, elle annonce ce qu'on cache.
          ressourcesMasquees ? undefined : (
            <Link
              href="/jeune/mes-favoris/ressources"
              className="inline-flex items-center gap-1 text-fs-200 font-black text-gj-teal-deep hover:underline"
            >
              Voir mes ressources favorites →
            </Link>
          )
        }
      />
      <MesFavoris />
    </div>
  )
}
