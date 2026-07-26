// Identité de l'appelant pour les appels internes hors web (GUIC-678).
//
// Problème : `callInternalRoute` ne propage que le COOKIE de la requête courante. Sur
// WhatsApp il n'y en a pas → les routes existantes répondent 401 et les outils d'écriture
// (badge, candidature, réservation, emprunt) retombent tous sur un simple lien web. Yaye
// connaît pourtant le `cjs_uid` : il est résolu par le lien magique SSO et vérifié avant
// d'entrer dans l'agent.
//
// Solution retenue : FRAPPER un cookie de session ÉPHÉMÈRE pour cette personne, avec la
// même signature que les sessions réelles (`encodeSession`), au lieu d'ouvrir un nouveau
// chemin de confiance par en-tête dans `getSession`. Conséquences :
//   • aucune surface d'authentification nouvelle — un en-tête « acteur interne » serait,
//     lui, présent sur TOUTES les routes et deviendrait un vecteur d'usurpation si le
//     secret fuyait ;
//   • le jeton vit 60 secondes et ne sort jamais du processus (jamais renvoyé au client) ;
//   • il ne porte AUCUN jeton SSO (`encodeSession` ne signe que les claims minimales) :
//     il donne l'identité applicative, pas les droits d'appeler le SSO.
//
// Le compte doit être ACTIF et non anonymisé — sinon aucune identité n'est frappée.

import { encodeSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/** Durée de vie du jeton d'acteur — le temps d'un appel in-process. */
const ACTOR_TTL_S = Number(process.env.YAYE_ACTOR_TTL_S ?? 60)

const SESSION_COOKIE = 'cjs_session'

/**
 * Construit l'en-tête `Cookie` d'une session éphémère pour `cjsUid`, ou `null` si la
 * personne est inconnue, suspendue ou anonymisée (le repli « lien web » s'applique alors).
 */
export async function buildActorCookieHeader(cjsUid: string): Promise<string | null> {
  try {
    const u = await prisma.utilisateur.findUnique({
      where: { cjsUid },
      select: {
        cjsUid: true, nom: true, prenom: true, email: true, telephone: true,
        region: true, role: true, onboardingComplete: true, statut: true, deletedAt: true,
      },
    })
    if (!u || u.deletedAt || u.statut !== 'actif') return null

    const token = await encodeSession({
      cjsUid: u.cjsUid,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      telephone: u.telephone,
      region: u.region ? String(u.region) : null,
      // Rôle mis en cache depuis le SSO ; à défaut, le moindre privilège.
      roles: [u.role ?? 'beneficiaire'],
      onboardingComplete: u.onboardingComplete,
      expiresAt: Math.floor(Date.now() / 1000) + ACTOR_TTL_S,
      // Aucun jeton SSO : identité applicative uniquement.
      accessToken: '',
      refreshToken: '',
    })
    return `${SESSION_COOKIE}=${token}`
  } catch (err) {
    logger.warn('[yaye:actor] frappe de session éphémère échouée', { err: String(err) })
    return null
  }
}
