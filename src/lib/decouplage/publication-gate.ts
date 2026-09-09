/**
 * GUIC-706 (Phase 2b) — gate de PUBLICATION (spec §4).
 *
 * Un recruteur peut publier une offre pour une organisation ssi les TROIS axes sont au
 * vert simultanément :
 *   - Organisation.statut = active        (levier org-level)
 *   - MembreOrganisation.statut = actif   (le recruteur est un membre non révoqué)
 *   - Utilisateur.statut = actif          (le compte de la personne n'est pas coupé)
 *
 * Fail-closed : org/membre introuvable ⇒ blocage. Distinct du gate de VISIBILITÉ jeune
 * (offre publiee ET org active) — ici c'est l'autorisation d'ÉMETTRE, pas d'afficher.
 */
import { prisma } from '@/lib/prisma'

export type RaisonBlocage = 'ORG_SUSPENDUE' | 'PERSONNE_INACTIVE' | 'NON_MEMBRE' | 'MEMBRE_INACTIF'

export type GatePublication = { ok: true } | { ok: false; raison: RaisonBlocage }

export async function verifierGatePublication(cjsUid: string, organisationId: string): Promise<GatePublication> {
  const org = await prisma.organisation.findUnique({ where: { id: organisationId }, select: { statut: true, cjsUid: true } })
  if (!org || org.statut === 'suspendue') return { ok: false, raison: 'ORG_SUSPENDUE' }

  const user = await prisma.utilisateur.findUnique({ where: { cjsUid }, select: { statut: true } })
  if (!user || user.statut !== 'actif') return { ok: false, raison: 'PERSONNE_INACTIVE' }

  const membre = await prisma.membreOrganisation.findUnique({
    where: { organisationId_cjsUid: { organisationId, cjsUid } },
    select: { statut: true },
  })
  // Une ligne membre explicite fait foi (l'appartenance multi-recruteur du découplage).
  if (membre) {
    if (membre.statut !== 'actif') return { ok: false, raison: 'MEMBRE_INACTIF' }
    return { ok: true }
  }
  // GUIC-706 — fallback legacy cohérent avec getRecruteurContext : le PROPRIÉTAIRE de l'org
  // (Organisation.cjsUid) est un membre implicite ACTIF tant qu'aucune ligne n'a été posée
  // (org d'avant le backfill des titulaires). Ferme le trou : le propriétaire, légitime avant
  // le découplage, n'est jamais verrouillé hors de sa propre organisation.
  if (org.cjsUid && org.cjsUid === cjsUid) return { ok: true }
  return { ok: false, raison: 'NON_MEMBRE' }
}
