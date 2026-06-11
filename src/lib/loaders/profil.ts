/**
 * Loaders profil — usage côté SSR pour pré-remplir des composants client (GUIC-361).
 *
 * `getViewerInfoForCandidature` agrège la session SSO + le `ProfilJeune` afin de
 * construire un `ViewerInfo` complet, prêt à être passé au `CandidatureModal`.
 *
 * Le but : éviter au formulaire de candidature de redemander à l'utilisateur des
 * informations qu'il a déjà renseignées sur son profil (email, niveau d'études,
 * situation, biographie, compétences, etc.).
 *
 * Lecture seule, pas de mutation. Renvoie `null` si la session est absente.
 */
import { prisma } from '@/lib/prisma'
import type { CJSSession } from '@/types/user'
import type { ViewerInfo } from '@/components/opportunites/CandidatureModal'

/** Convertit une valeur Json Prisma en `string[]` (filtre les non-strings). */
function jsonToStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

/** Calcule l'âge en années à partir d'une date de naissance. */
function ageFromBirthdate(d: Date | null): number | null {
  if (!d) return null
  const diffMs = Date.now() - d.getTime()
  const ageDt = new Date(diffMs)
  const age = Math.abs(ageDt.getUTCFullYear() - 1970)
  return age > 0 && age < 130 ? age : null
}

/**
 * Construit le `ViewerInfo` complet pour le `CandidatureModal` : claims SSO de
 * la session + données enrichies du `ProfilJeune` (biographie, compétences…).
 *
 * Toutes les valeurs absentes sont retournées en `null` / `[]` — le composant
 * gère l'affichage conditionnel.
 */
export async function getViewerInfoForCandidature(
  session: CJSSession | null,
): Promise<ViewerInfo | null> {
  if (!session) return null

  const row = await prisma.utilisateur.findUnique({
    where: { cjsUid: session.cjsUid },
    select: {
      dateNaissance: true,
      profil: {
        select: {
          photoUrl: true,
          biographie: true,
          niveauEtude: true,
          situationEmploi: true,
          competences: true,
          domainesInteret: true,
        },
      },
    },
  })

  const profil = row?.profil ?? null
  return {
    prenom: session.prenom,
    nom: session.nom,
    telephone: session.telephone,
    email: session.email,
    region: session.region,
    age: ageFromBirthdate(row?.dateNaissance ?? null),
    niveauEtude: profil?.niveauEtude ?? null,
    situationEmploi: profil?.situationEmploi ?? null,
    biographie: profil?.biographie ?? null,
    competences: jsonToStringArray(profil?.competences),
    domainesInteret: jsonToStringArray(profil?.domainesInteret),
    photoUrl: profil?.photoUrl ?? null,
  }
}
