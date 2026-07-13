// Construit les données d'affichage de la carte membre CJS d'un bénéficiaire à partir de son
// cjsUid. Partagé par la page /jeune/ma-carte ET l'agent Yaye (get_badge → bloc `carte_cjs`),
// pour ne pas dupliquer le format matricule / « membre depuis ».

import { prisma } from '@/lib/prisma'
import type { YayeCarteCjsUser } from '@/lib/ia/blocks'

/** Matricule lisible : « GJS · <initiales> · <6 premiers du cjsUid> ». */
export function formatMatricule(prenom: string, nom: string, cjsUid: string): string {
  const initials = `${(prenom[0] ?? '?').toUpperCase()}${(nom[0] ?? '?').toUpperCase()}`
  return `GJS · ${initials} · ${cjsUid.slice(0, 6).toUpperCase()}`
}

/** Assemble la carte membre (ou null si l'utilisateur est introuvable). */
export async function buildCjsCardUser(cjsUid: string): Promise<YayeCarteCjsUser | null> {
  const u = await prisma.utilisateur.findUnique({
    where: { cjsUid },
    select: {
      nom: true,
      prenom: true,
      createdAt: true,
      profil: {
        select: {
          createdAt: true,
          centrePrincipal: { select: { nom: true, region: true } },
        },
      },
    },
  })
  if (!u) return null
  const created = u.profil?.createdAt ?? u.createdAt
  const membreDepuis = created
    ? new Date(created).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })
    : '—'
  const centre = u.profil?.centrePrincipal
  return {
    prenom: u.prenom ?? '',
    nom: u.nom ?? '',
    matricule: formatMatricule(u.prenom ?? '', u.nom ?? '', cjsUid),
    membreDepuis,
    ...(centre ? { centrePrincipal: { nom: centre.nom, region: String(centre.region ?? '') } } : {}),
  }
}
