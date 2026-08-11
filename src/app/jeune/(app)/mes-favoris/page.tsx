import type { Metadata } from 'next'
import Link from 'next/link'
import { MesFavoris } from '@/components/jeune/MesFavoris'
import { PageHeader } from '@/components/ui'

export const metadata: Metadata = { title: 'Mes sauvegardes' }

export default function MesFavorisPage() {
  return (
    <div>
      <PageHeader
        title="Mes sauvegardes"
        subtitle="Les opportunités que vous avez sauvegardées"
        actions={
          <Link
            href="/jeune/mes-favoris/ressources"
            className="inline-flex items-center gap-1 text-fs-200 font-black text-gj-teal-deep hover:underline"
          >
            Voir mes ressources favorites →
          </Link>
        }
      />
      <MesFavoris />
    </div>
  )
}
