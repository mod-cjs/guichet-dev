import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { searchLivres } from '@/lib/bibliotheque/service'
import { PageHeader, Card, Icon, EmptyState, Pagination } from '@/components/ui'
import { BiblioSearchForm } from './biblio-search-form'

export const metadata: Metadata = {
  title: 'Bibliothèque',
  description: 'Catalogue des livres disponibles dans les centres CJS.',
}

export const dynamic = 'force-dynamic'

const THEMES = [
  'Agriculture',
  'Droit',
  'Economie',
  'Education',
  'Environnement',
  'Entrepreneuriat',
  'Informatique',
  'Littérature',
  'Médecine',
  'Sciences',
  'Société',
]

export default async function BibliothequeJeunePage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; theme?: string; page?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect('/auth/connexion?return=%2Fjeune%2Fbibliotheque')
  }

  const sp = (await searchParams) ?? {}
  const q = sp.q?.trim() || undefined
  const theme = sp.theme?.trim() || undefined
  const page = Math.max(1, Number(sp.page) || 1)

  const { livres, total, pageSize } = await searchLivres({ q, theme, page })
  const totalPages = Math.ceil(total / pageSize)

  // Build base URL for pagination preserving filters
  const paramParts: string[] = []
  if (q) paramParts.push(`q=${encodeURIComponent(q)}`)
  if (theme) paramParts.push(`theme=${encodeURIComponent(theme)}`)
  const baseUrl = `/jeune/bibliotheque${paramParts.length ? `?${paramParts.join('&')}` : ''}`

  return (
    <div className="flex flex-col gap-space-5">
      <PageHeader
        title="Bibliothèque"
        subtitle="Découvre et emprunte des livres dans les centres CJS."
      />

      <BiblioSearchForm
        defaultQ={q ?? ''}
        defaultTheme={theme ?? ''}
        themes={THEMES}
      />

      {total > 0 && (
        <p className="text-fs-200 text-color-text-secondary">
          {total} livre{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
        </p>
      )}

      {livres.length === 0 ? (
        <div className="flex flex-col items-center gap-space-4">
          <EmptyState
            illustration="search"
            title="Aucun livre trouvé"
            description={
              q || theme
                ? 'Essaie avec des mots-clés différents ou supprime les filtres.'
                : 'Le catalogue est vide pour le moment.'
            }
          />
          {(q || theme) && (
            <Link
              href="/jeune/bibliotheque"
              className="no-underline inline-flex items-center justify-center min-h-[var(--tap-min)] px-space-4 rounded-gj-md bg-gj-teal-deep text-white font-bold"
            >
              Voir tout le catalogue
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-4 list-none p-0 m-0">
          {livres.map((livre) => (
            <li key={livre.id}>
              <Link
                href={`/jeune/bibliotheque/${livre.id}`}
                className="no-underline block h-full"
              >
                <Card
                  variant="opportunite"
                  className="h-full flex flex-col cursor-pointer hover:shadow-gj-md transition-shadow"
                >
                  <div className="flex gap-space-3">
                    <div className="flex-shrink-0 w-12 h-16 bg-gj-teal-soft rounded-gj-sm flex items-center justify-center">
                      <Icon name="resources" size={24} style={{ color: 'var(--gj-teal-deep)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-fs-300 font-bold text-color-text-primary line-clamp-2 leading-snug">
                        {livre.titre}
                      </p>
                      <p className="text-fs-200 text-color-text-secondary mt-space-1 truncate">
                        {livre.auteur}
                      </p>
                    </div>
                  </div>
                  <div className="mt-space-3 flex items-center justify-between gap-space-2">
                    <span
                      className="inline-block text-fs-100 font-bold px-space-2 rounded-gj-pill"
                      style={{
                        background: 'var(--gj-teal-soft)',
                        color: 'var(--gj-teal-deep)',
                        padding: '2px 10px',
                      }}
                    >
                      {livre.theme}
                    </span>
                    <span
                      className={`text-fs-200 font-bold ${
                        livre.exemplairesDisponibles > 0
                          ? 'text-gj-green-ink'
                          : 'text-color-text-muted'
                      }`}
                    >
                      {livre.exemplairesDisponibles > 0
                        ? `${livre.exemplairesDisponibles} dispo.`
                        : 'Non disponible'}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-space-2">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl={baseUrl}
            ariaLabel="Pagination du catalogue"
          />
        </div>
      )}
    </div>
  )
}
