import type { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EmptyState } from '@/components/ui'
import { getCentresWithStatusAndHoraires } from '@/lib/loaders/centres'
import { CentresAllClient } from './centres-all-client'

export const metadata: Metadata = { title: 'Centres CJS' }

/**
 * `/centres` — vue `all` du Lot 7 W2 (GUIC-353).
 *
 * Server component : récupère la session SSO, charge les centres enrichis
 * (services, horaires, statut ouvert/fermé calculé serveur) puis délègue
 * au client `<CentresAllClient>` qui gère le layout adaptatif et les
 * filtres.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 2.
 */
export default async function CentresPage() {
  const session = await getSession()
  const centres = await getCentresWithStatusAndHoraires()

  if (centres.length === 0) {
    return (
      <div className="bg-gj-bg min-h-[100dvh] flex items-center justify-center p-space-4">
        <EmptyState
          title="Aucun centre disponible"
          description="Les centres CJS seront bientôt accessibles ici."
        />
      </div>
    )
  }

  let userCentrePrincipalId: string | null = null
  let userCard: React.ComponentProps<typeof CentresAllClient>['user'] = undefined

  if (session) {
    // Lecture défensive : `centrePrincipalId` n'existe sur ProfilJeune qu'après W0.
    // On ne sélectionne que les colonnes garanties et on lit la valeur
    // optionnelle via cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profil: any = await prisma.profilJeune
      .findUnique({ where: { cjsUid: session.cjsUid } })
      .catch(() => null)

    userCentrePrincipalId = profil?.centrePrincipalId ?? null

    const principal = userCentrePrincipalId
      ? centres.find((c) => c.id === userCentrePrincipalId)
      : undefined

    const initials = `${(session.prenom?.[0] ?? '?').toUpperCase()}${(session.nom?.[0] ?? '?').toUpperCase()}`
    userCard = {
      cjsUid: session.cjsUid,
      prenom: session.prenom ?? '',
      nom: session.nom ?? '',
      matricule: `GJS · ${initials} · ${session.cjsUid.slice(0, 6).toUpperCase()}`,
      membreDepuis: profil?.createdAt
        ? new Date(profil.createdAt).toLocaleDateString('fr-FR', {
            month: '2-digit',
            year: 'numeric',
          })
        : '—',
      centrePrincipal: principal
        ? { nom: principal.nom, region: principal.region }
        : null,
      // GUIC-369 — `ProfilJeune.photoUrl` est un Blob Vercel privé, on passe
      // par le proxy `/api/profil/photo/file` (gère le token côté serveur).
      photoUrl: profil?.photoUrl ? `/api/profil/photo/file?cb=${encodeURIComponent(session.cjsUid)}` : null,
    }
  }

  return (
    <CentresAllClient
      centres={centres}
      userCentrePrincipalId={userCentrePrincipalId}
      userIsConnected={Boolean(session)}
      user={userCard}
    />
  )
}
