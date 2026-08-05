import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadProfilComplet } from '@/lib/profil-loader'
import { getMesUsages } from '@/lib/loaders/centres'
import { MaCarteClient } from './ma-carte-client'

// GUIC-386 — Wave 6.1 — Page « Ma carte CJS » + QR JWT rotatif.

export const metadata: Metadata = {
  title: 'Ma carte CJS',
  description:
    'Ta carte CJS personnelle, le QR de check-in et tes derniers usages dans les centres CJS.',
}

export const dynamic = 'force-dynamic'

export default async function MaCartePage() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/connexion?return=%2Fjeune%2Fma-carte')
  }

  const [profil, usages, compte] = await Promise.all([
    loadProfilComplet(session.cjsUid),
    getMesUsages(session.cjsUid),
    // GUIC-689 — matricule et date d'INSCRIPTION lus sur le compte : ils
    // existent désormais, la carte n'a plus à les reconstituer.
    prisma.utilisateur.findUnique({
      where: { cjsUid: session.cjsUid },
      select: { matricule: true, createdAt: true },
    }),
  ])

  // `Utilisateur.createdAt` = date d'INSCRIPTION. L'ancien code lisait
  // `ProfilJeune.createdAt`, la date de création du PROFIL : un membre de 2019
  // ayant complété son profil en 2026 s'affichait « membre depuis 2026 ».
  const membreDepuis = compte?.createdAt
    ? new Date(compte.createdAt).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })
    : null

  const prenom = profil?.prenom ?? session.prenom ?? ''
  const nom = profil?.nom ?? session.nom ?? ''
  // Le matricule PERSISTÉ, jamais recomposé : l'ancien (`GJS · AD · 009AC3`)
  // ressemblait à un identifiant officiel sans en être un — non garanti unique,
  // introuvable côté back-office, et il imprimait un fragment du `cjsUid`,
  // identifiant technique inter-plateformes, sur un support physique.
  const matricule = compte?.matricule ?? null

  const user = {
    prenom,
    nom,
    matricule,
    membreDepuis,
    photoUrl: profil?.profil?.photoUrl
      ? `/api/profil/photo/file?cb=${encodeURIComponent(session.cjsUid)}`
      : undefined,
  }

  return <MaCarteClient user={user} cjsUid={session.cjsUid} usages={usages} />
}
