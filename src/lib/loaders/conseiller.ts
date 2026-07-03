import { prisma } from '@/lib/prisma'

/**
 * GUIC-493 / GUIC-501 — Loaders de l'Espace conseiller (Lot 8).
 *
 * Le conseiller est authentifié en SSO (`getSession()`), et son périmètre est
 * défini par ses rattachements `AgentCentre` (cjs_uid ↔ centre_id). Toutes les
 * données de l'espace sont scopées au centre actif. Voir
 * `.agent_context/specs/M8-espace-conseiller.md`.
 */

export interface ConseillerCentre {
  id: string
  nom: string
}

export interface ConseillerContext {
  cjsUid: string
  prenom: string
  nom: string
  /** Initiales pour l'avatar de la sidebar. */
  initials: string
  /** Rôle AgentCentre du centre actif (ex. « conseiller »). */
  role: string
  /** Centre de rattachement actif. */
  centreId: string
  centreNom: string
  /** Tous les centres de rattachement (multi-centre). */
  centres: ConseillerCentre[]
}

/** Initiales (2 lettres max) à partir du prénom/nom, en majuscules. */
export function buildInitials(prenom?: string | null, nom?: string | null): string {
  const p = (prenom ?? '').trim()
  const n = (nom ?? '').trim()
  const a = p ? p[0] : ''
  const b = n ? n[0] : ''
  return `${a}${b}`.toUpperCase()
}

/**
 * Choisit le centre actif parmi les rattachements : le centre préféré s'il
 * existe, sinon le premier. `null` si le conseiller n'a aucun rattachement.
 */
export function pickActiveCentre(
  centres: ConseillerCentre[],
  preferredId?: string | null,
): ConseillerCentre | null {
  if (centres.length === 0) return null
  if (preferredId) {
    const found = centres.find((c) => c.id === preferredId)
    if (found) return found
  }
  return centres[0]
}

/**
 * Contexte conseiller pour le chrome (sidebar/topbar) et le guard du layout.
 * Retourne `null` si l'utilisateur n'est rattaché à aucun centre — le layout
 * l'interprète comme « pas conseiller » et redirige.
 */
export async function getConseillerContext(
  cjsUid: string,
  preferredCentreId?: string | null,
): Promise<ConseillerContext | null> {
  const [user, links] = await Promise.all([
    prisma.utilisateur.findUnique({
      where: { cjsUid },
      select: { prenom: true, nom: true },
    }),
    prisma.agentCentre.findMany({
      where: { cjsUid },
      select: { role: true, centre: { select: { id: true, nom: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (links.length === 0) return null

  const centres: ConseillerCentre[] = links.map((l) => ({ id: l.centre.id, nom: l.centre.nom }))
  const active = pickActiveCentre(centres, preferredCentreId)
  // `active` ne peut être null ici (links.length > 0) mais on garde le garde-fou.
  if (!active) return null

  return {
    cjsUid,
    prenom: user?.prenom ?? '',
    nom: user?.nom ?? '',
    initials: buildInitials(user?.prenom, user?.nom),
    role: links[0].role,
    centreId: active.id,
    centreNom: active.nom,
    centres,
  }
}
