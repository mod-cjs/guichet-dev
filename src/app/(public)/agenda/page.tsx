import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { listEvenements } from '@/lib/loaders/evenements'
import { AgendaClient } from './agenda-client'
import { prisma } from '@/lib/prisma'
import { loadProgrammeOptions } from '@/lib/programmes/options'
import { getSession } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Agenda — Événements',
  description:
    'Formations, ateliers, forums et webinaires du réseau CJS au Sénégal — agenda public.',
  alternates: { canonical: '/agenda' },
}

// Force le rendu dynamique : la liste évolue dans le temps et l'auth conditionne l'UI.
export const dynamic = 'force-dynamic'

export default async function AgendaPage() {
  const [{ items, total }, session, programmes] = await Promise.all([
    listEvenements(),
    getSession(),
    loadProgrammeOptions(prisma),
  ])

  return (
    <div className="container-page py-space-6">
      <header className="mb-space-5 flex flex-wrap items-end justify-between gap-space-3">
        <div>
          <h1 className="text-fs-800 font-black text-color-text-primary">Agenda &amp; événements</h1>
          <p className="text-fs-300 text-color-text-secondary mt-space-1">
            {total} à venir · ateliers, forums, formations et webinaires
          </p>
        </div>
        {session && (
          <Link
            href="/jeune/mes-inscriptions"
            className="inline-flex items-center gap-1 px-space-3 py-space-1 rounded-gj-md border border-gj-line bg-white text-fs-200 font-bold text-color-text-primary hover:bg-gj-teal-soft min-h-[var(--tap-min)]"
          >
            <Icon name="bookmark" size={14} />
            Mes événements
          </Link>
        )}
      </header>

      <AgendaClient
        initialItems={items}
        total={total}
        isAuthenticated={!!session}
        programmes={programmes}
      />
    </div>
  )
}
