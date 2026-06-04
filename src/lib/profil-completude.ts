/**
 * GUIC-232 — Calcul de complétude profil pour candidater.
 *
 * Source de vérité partagée entre :
 *  - `POST /api/candidatures` (refus 403 PROFILE_INCOMPLETE)
 *  - `GET  /api/profil/completude` (pré-affichage côté client)
 *
 * Mitige les candidatures vides quand le CV est facultatif : on exige au
 * minimum identité (prenom/nom/email/telephone) + ancrage (region) + profil
 * de base (niveauEtude/situationEmploi/domainesInteret ≥ 1).
 *
 * Note : diplômes, expériences et certificats restent optionnels (décision PO).
 */

import { prisma } from '@/lib/prisma'
import type { ChampProfilRequis } from '@/lib/constants/candidature'

export interface CompletudeResult {
  complet: boolean
  missing: ChampProfilRequis[]
}

/** Identité minimale lisible depuis la session SSO. */
export interface SessionIdentite {
  prenom: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  region: string | null
}

/**
 * Vérifie qu'un profil contient les champs minimums pour candidater.
 *
 * Retourne `complet: true` si tous les champs requis sont renseignés ;
 * sinon `missing` liste les champs manquants dans l'ordre de
 * `PROFIL_REQUIS_CANDIDATURE`.
 */
export async function checkProfilCompletude(
  cjsUid: string,
  session: SessionIdentite,
): Promise<CompletudeResult> {
  const profil = await prisma.profilJeune.findUnique({
    where: { cjsUid },
    select: {
      niveauEtude: true,
      situationEmploi: true,
      domainesInteret: true,
    },
  })

  const missing: ChampProfilRequis[] = []

  if (!session.prenom) missing.push('prenom')
  if (!session.nom) missing.push('nom')
  if (!session.email) missing.push('email')
  if (!session.telephone) missing.push('telephone')
  if (!session.region) missing.push('region')

  if (!profil?.niveauEtude) missing.push('niveauEtude')
  if (!profil?.situationEmploi) missing.push('situationEmploi')

  const domaines = profil?.domainesInteret
  const domainesArr = Array.isArray(domaines) ? domaines : null
  if (!domainesArr || domainesArr.length === 0) {
    missing.push('domainesInteret')
  }

  return { complet: missing.length === 0, missing }
}
