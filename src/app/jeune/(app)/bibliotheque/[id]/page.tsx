import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getLivre, BiblioDomainError } from '@/lib/bibliotheque/service'
import { Card, Icon } from '@/components/ui'
import { EmpruntButton } from './emprunt-button'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const livre = await getLivre(id)
    return {
      title: livre.titre,
      description: livre.resume ?? `${livre.titre} — ${livre.auteur}`,
    }
  } catch {
    return { title: 'Livre introuvable' }
  }
}

export default async function BiblioLivreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) {
    const { id } = await params
    redirect(`/auth/connexion?return=%2Fjeune%2Fbibliotheque%2F${id}`)
  }

  const { id } = await params
  let livre
  try {
    livre = await getLivre(id)
  } catch (err) {
    if (err instanceof BiblioDomainError && err.code === 'LIVRE_NOT_FOUND') {
      notFound()
    }
    throw err
  }

  const emplacementsDisponibles = livre.emplacements

  return (
    <div className="flex flex-col gap-space-5 max-w-3xl">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-space-2 text-fs-200 text-color-text-secondary">
        <Link href="/jeune/bibliotheque" className="hover:underline inline-flex items-center gap-space-1 text-gj-teal">
          <Icon name="chevron-left" size={14} />
          Bibliothèque
        </Link>
      </nav>

      <div className="flex flex-col sm:flex-row gap-space-5">
        {/* Couverture */}
        <div className="flex-shrink-0">
          {livre.couvertureUrl ? (
            <Image
              src={livre.couvertureUrl}
              alt={`Couverture de ${livre.titre}`}
              width={160}
              height={220}
              className="rounded-gj-lg object-cover shadow-gj-md"
              style={{ width: 160, height: 220 }}
            />
          ) : (
            <div
              className="rounded-gj-lg bg-gj-teal-soft flex items-center justify-center"
              style={{ width: 160, height: 220 }}
            >
              <Icon name="resources" size={48} style={{ color: 'var(--gj-teal-deep)' }} />
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex flex-col gap-space-3 flex-1 min-w-0">
          <div>
            <h1 className="text-fs-700 font-black text-color-text-primary leading-tight">
              {livre.titre}
            </h1>
            <p className="text-fs-400 text-color-text-secondary mt-space-1">{livre.auteur}</p>
          </div>

          <div className="flex flex-wrap gap-space-2">
            <span
              className="text-fs-100 font-bold px-space-2 rounded-gj-pill"
              style={{
                background: 'var(--gj-teal-soft)',
                color: 'var(--gj-teal-deep)',
                padding: '3px 12px',
              }}
            >
              {livre.theme}
            </span>
            {livre.niveau && (
              <span
                className="text-fs-100 font-bold px-space-2 rounded-gj-pill"
                style={{
                  background: 'var(--gj-bg)',
                  color: 'var(--gj-grey)',
                  padding: '3px 12px',
                  border: '1.5px solid var(--gj-line)',
                }}
              >
                {livre.niveau}
              </span>
            )}
            <span
              className="text-fs-100 font-bold px-space-2 rounded-gj-pill"
              style={{
                background: 'var(--gj-bg)',
                color: 'var(--gj-grey)',
                padding: '3px 12px',
                border: '1.5px solid var(--gj-line)',
              }}
            >
              {livre.langue.toUpperCase()}
            </span>
          </div>

          {livre.isbn && (
            <p className="text-fs-200 text-color-text-muted">
              ISBN : {livre.isbn}
            </p>
          )}

          <div
            className="flex items-center gap-space-2 text-fs-300 font-bold"
            style={{
              color: livre.exemplairesDisponibles > 0 ? 'var(--gj-green-ink)' : 'var(--gj-grey)',
            }}
          >
            <Icon name="check-circle" size={16} />
            {livre.exemplairesDisponibles > 0
              ? `${livre.exemplairesDisponibles} exemplaire${livre.exemplairesDisponibles > 1 ? 's' : ''} disponible${livre.exemplairesDisponibles > 1 ? 's' : ''}`
              : 'Aucun exemplaire disponible en ce moment'}
          </div>
        </div>
      </div>

      {/* Résumé */}
      {livre.resume && (
        <Card variant="default">
          <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-2">Résumé</h2>
          <p className="text-fs-300 text-color-text-secondary leading-relaxed">{livre.resume}</p>
        </Card>
      )}

      {/* Emplacements disponibles */}
      {emplacementsDisponibles.length > 0 ? (
        <Card variant="default">
          <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-3">
            Où trouver ce livre
          </h2>
          <ul className="flex flex-col gap-space-3 list-none p-0 m-0">
            {emplacementsDisponibles.map((emp) => (
              <li
                key={emp.exemplaireId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 p-space-3 rounded-gj-md"
                style={{ background: 'var(--gj-bg)', border: '1.5px solid var(--gj-line)' }}
              >
                <div className="flex flex-col gap-space-1">
                  <div className="flex items-center gap-space-2">
                    <Icon name="pin" size={16} style={{ color: 'var(--gj-teal-deep)', flexShrink: 0 }} />
                    <span className="text-fs-300 font-bold text-color-text-primary">
                      {emp.centreNom}
                    </span>
                  </div>
                  <p className="text-fs-200 text-color-text-secondary pl-space-5">
                    Rayon {emp.rayon} · Étagère {emp.etagere} · Position {emp.position}
                  </p>
                </div>
                <EmpruntButton
                  exemplaireId={emp.exemplaireId}
                  centreNom={emp.centreNom}
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card variant="default">
          <div className="flex flex-col items-center text-center gap-space-3 py-space-4">
            <div className="w-12 h-12 rounded-full bg-gj-bg flex items-center justify-center">
              <Icon name="alert" size={24} style={{ color: 'var(--gj-grey)' }} />
            </div>
            <div>
              <p className="text-fs-300 font-bold text-color-text-primary">
                Aucun exemplaire disponible
              </p>
              <p className="text-fs-200 text-color-text-secondary mt-space-1">
                Ce livre est actuellement emprunté dans tous les centres. Reviens plus tard.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
