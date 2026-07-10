// GUIC-140 — Lien magique de liaison numéro WhatsApp ↔ cjs_uid.
//
// Mécanique « code depuis WhatsApp » : un utilisateur non lié écrit → on génère
// un token à usage unique (TTL 10 min) porté par une URL. Ouverture → SSO CJS →
// le téléphone (résolu depuis le token) est lié au cjs_uid authentifié.
//
// Le token ne prouve rien à lui seul : la preuve d'identité vient du SSO. Le token
// ne fait que rattacher le bon numéro à la session SSO qui suit (aucun login local).

import { randomBytes } from 'node:crypto'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { logger, hashId } from '@/lib/logger'

const TOKEN_PREFIX = 'guichet:whatsapp:link:'
const THROTTLE_PREFIX = 'guichet:whatsapp:link:throttle:'

/** Durée de validité du lien magique (secondes). */
export const LINK_TTL_S = 10 * 60
/** Nombre maximum de liens générés par téléphone et par heure (anti-abus). */
export const LINK_MAX_PER_HOUR = 3

/**
 * Normalise un numéro en E.164 (`+221XXXXXXXXX`).
 * Gère `+221…`, `00221…`, le format WhatsApp sans `+` (`221…`) et les numéros
 * locaux sénégalais à 9 chiffres. Retourne l'entrée nettoyée si non reconnue.
 */
export function toE164(phone: string): string {
  const cleaned = phone.replace(/[\s\-.()]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2)
  if (/^\d{9}$/.test(cleaned)) return '+221' + cleaned
  return '+' + cleaned.replace(/^\+/, '')
}

/**
 * Génère un token cryptographique à usage unique et l'associe au téléphone dans
 * Redis (TTL 10 min). Le token n'est jamais journalisé.
 */
export async function createLinkToken(telephone: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await redis.set(TOKEN_PREFIX + token, telephone, 'EX', LINK_TTL_S)
  return token
}

/**
 * Consomme un token : retourne le téléphone associé et le supprime de façon
 * atomique (`GETDEL`) → usage unique garanti, immunisé au rejeu concurrent.
 */
export async function consumeLinkToken(token: string): Promise<string | null> {
  if (!token) return null
  const telephone = await redis.getdel(TOKEN_PREFIX + token)
  return telephone ?? null
}

/** URL du lien magique à envoyer sur WhatsApp. */
export function buildMagicLinkUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/whatsapp/link?token=${token}`
}

/**
 * Anti-abus : borne le nombre de liens générés par téléphone et par heure.
 * Retourne `true` si la demande est sous le plafond.
 */
export async function withinLinkRateLimit(telephone: string): Promise<boolean> {
  const key = THROTTLE_PREFIX + telephone
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 3600)
  return count <= LINK_MAX_PER_HOUR
}

/**
 * Lie (ou re-lie) un numéro à un compte. Idempotent : re-lier le même compte est
 * un no-op fonctionnel ; re-lier un autre compte écrase (dernier gagnant).
 * 1 téléphone → 1 cjs_uid (contrainte d'unicité sur `telephone`).
 */
export async function bindWhatsAppNumber(telephone: string, cjsUid: string): Promise<void> {
  const now = new Date()

  // Détecte un re-lien vers un AUTRE compte pour le journaliser (traçabilité CDP).
  const existing = await prisma.conversationWhatsApp.findUnique({
    where: { telephone },
    select: { cjsUid: true },
  })
  if (existing?.cjsUid && existing.cjsUid !== cjsUid) {
    // Identifiants HACHÉS — jamais de cjs_uid ni de téléphone en clair dans les logs.
    logger.warn('whatsapp-link: re-liaison d’un numéro vers un autre compte', {
      telephoneHash: hashId(telephone),
      ancienUidHash: hashId(existing.cjsUid),
      nouveauUidHash: hashId(cjsUid),
    })
  }

  await prisma.conversationWhatsApp.upsert({
    where: { telephone },
    create: { telephone, cjsUid, linkedAt: now },
    update: { cjsUid, linkedAt: now },
  })
}

/** Message de confirmation envoyé sur WhatsApp une fois la liaison effectuée. */
export function linkConfirmationMessage(): string {
  return (
    '✅ Ton compte Guichet Jeunesse est maintenant lié à ce numéro. ' +
    'Tu peux chercher des opportunités et postuler directement ici avec moi, Yaye.'
  )
}

// Mots-clés d'opt-out (norme Meta « STOP »). Déliaison self-service côté WhatsApp,
// en complément d'une future UI /jeune/paramètres.
const UNLINK_KEYWORDS = new Set(['stop', 'delier', 'délier'])

/** `true` si le message est EXACTEMENT un mot-clé de déliaison (insensible casse/accents/espaces). */
export function isUnlinkKeyword(text: string): boolean {
  return UNLINK_KEYWORDS.has(text.trim().toLowerCase())
}

/**
 * Délie un numéro de son compte : détache l'identité (cjsUid + linkedAt à NULL)
 * sans supprimer la conversation ni son historique. Réversible via un nouveau
 * lien magique.
 */
export async function unbindWhatsAppNumber(telephone: string): Promise<void> {
  await prisma.conversationWhatsApp.update({
    where: { telephone },
    data: { cjsUid: null, linkedAt: null },
  })
}

/** Message de confirmation après une déliaison. */
export function unlinkConfirmationMessage(): string {
  return (
    'Ton numéro a été délié de ton compte Guichet Jeunesse. ' +
    'Écris-moi à nouveau à tout moment pour le relier.'
  )
}
