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

  const [profil, usages] = await Promise.all([
    loadProfilComplet(session.cjsUid),
    getMesUsages(session.cjsUid),
  ])

  // Date d'adhésion (membre depuis) — depuis ProfilJeune.createdAt si dispo.
  let membreDepuis = '—'
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pj: any = await (prisma as any).profilJeune
      .findUnique({ where: { cjsUid: session.cjsUid }, select: { createdAt: true } })
      .catch(() => null)
    if (pj?.createdAt) {
      membreDepuis = new Date(pj.createdAt).toLocaleDateString('fr-FR', {
        month: '2-digit',
        year: 'numeric',
      })
    }
  } catch {
    /* fail-soft */
  }

  const prenom = profil?.prenom ?? session.prenom ?? ''
  const nom = profil?.nom ?? session.nom ?? ''
  const initials = `${(prenom[0] ?? '?').toUpperCase()}${(nom[0] ?? '?').toUpperCase()}`
  const matricule = `GJS · ${initials} · ${session.cjsUid.slice(0, 6).toUpperCase()}`

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
