import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getEmpruntsActifs } from '@/lib/bibliotheque/service'
import { PageHeader, Card, EmptyState, Icon } from '@/components/ui'
import type { StatutEmprunt } from '@prisma/client'

export const metadata: Metadata = {
  title: 'Mes emprunts',
  description: 'Tes emprunts de livres en cours dans les centres CJS.',
}

export const dynamic = 'force-dynamic'

const STATUT_LABELS: Record<StatutEmprunt, string> = {
  initie: 'À retirer au centre',
  en_cours: 'En cours',
  en_retard: 'En retard',
  rendu: 'Rendu',
  annule: 'Annulé',
}

const STATUT_COLORS: Record<StatutEmprunt, { bg: string; color: string }> = {
  initie: { bg: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' },
  en_cours: { bg: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' },
  en_retard: { bg: 'var(--gj-red-soft)', color: 'var(--gj-red)' },
  rendu: { bg: 'var(--gj-bg)', color: 'var(--gj-grey)' },
  annule: { bg: 'var(--gj-bg)', color: 'var(--gj-grey)' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default async function MesEmpruntsPage() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/connexion?return=%2Fjeune%2Fbibliotheque%2Fmes-emprunts')
  }

  const emprunts = await getEmpruntsActifs(session.cjsUid)

  return (
    <div className="flex flex-col gap-space-5">
      <PageHeader
        title="Mes emprunts"
        subtitle="Tes livres en cours d'emprunt dans les centres CJS."
        actions={
          <Link
            href="/jeune/bibliotheque"
            className="inline-flex items-center gap-space-1 text-fs-300 font-bold text-gj-teal hover:underline"
          >
            <Icon name="resources" size={16} />
            Catalogue
          </Link>
        }
      />

      {emprunts.length === 0 ? (
        <div className="flex flex-col items-center gap-space-4">
          <EmptyState
            illustration="inbox"
            title="Aucun emprunt en cours"
            description="Tu n'as pas de livre emprunté pour l'instant. Explore le catalogue pour en trouver un."
          />
          <Link
            href="/jeune/bibliotheque"
            className="no-underline inline-flex items-center justify-center min-h-[var(--tap-min)] px-space-4 rounded-gj-md bg-gj-teal-deep text-white font-bold"
          >
            Explorer la bibliothèque
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-space-3 list-none p-0 m-0">
          {emprunts.map((emprunt) => {
            const colors = STATUT_COLORS[emprunt.statut]
            return (
              <li key={emprunt.id}>
                <Card variant="default" accent={emprunt.statut === 'en_retard' ? 'red' : 'teal'}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-space-3">
                    <div className="flex gap-space-3 flex-1 min-w-0">
                      <div
                        className="flex-shrink-0 w-10 h-12 rounded-gj-sm flex items-center justify-center"
                        style={{ background: 'var(--gj-teal-soft)' }}
                      >
                        <Icon name="resources" size={20} style={{ color: 'var(--gj-teal-deep)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/jeune/bibliotheque/${emprunt.livre.id}`}
                          className="text-fs-400 font-bold text-color-text-primary hover:underline line-clamp-2"
                        >
                          {emprunt.livre.titre}
                        </Link>
                        <p className="text-fs-200 text-color-text-secondary mt-space-1 truncate">
                          {emprunt.livre.auteur}
                        </p>
                        <div className="flex items-center gap-space-1 mt-space-1">
                          <Icon name="pin" size={13} style={{ color: 'var(--gj-grey)', flexShrink: 0 }} />
                          <p className="text-fs-200 text-color-text-secondary truncate">
                            {emprunt.exemplaire.centreNom}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-space-2 flex-shrink-0">
                      <span
                        className="text-fs-100 font-bold rounded-gj-pill"
                        style={{
                          background: colors.bg,
                          color: colors.color,
                          padding: '3px 12px',
                        }}
                      >
                        {STATUT_LABELS[emprunt.statut]}
                      </span>
                      {emprunt.dateRetourPrevue && (
                        <div className="flex items-center gap-space-1">
                          <Icon name="calendar" size={13} style={{ color: 'var(--gj-grey)' }} />
                          <span className="text-fs-200 text-color-text-secondary">
                            Retour prévu : {formatDate(emprunt.dateRetourPrevue)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
