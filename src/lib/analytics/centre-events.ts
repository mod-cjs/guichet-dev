/**
 * Centre events tracking — GUIC-351 / EPIC GUIC-350.
 * KPI fréquentation centres (déclaration PO TRÈS IMPORTANT).
 *
 * Source de vérité spec : `.agent_context/specs/M4-centres-lot7.md` §3.4.
 *
 * Helper INSERT-only sur la table `centre_events` via Prisma.
 * Fail-soft : si Prisma échoue (DB down, etc.), on logue un warning mais on ne
 * throw JAMAIS au callsite — le tracking ne doit pas bloquer l'expérience.
 *
 * Exception : `CentreEventMetadataTooLarge` est throw si metadata dépasse 2 KB
 * (sérialisé JSON). Le callsite doit gérer (anti-flood + protection DB).
 *
 * Types canoniques (whitelist stricte côté API publique /api/v1/track).
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/** Whitelist exhaustive des types d'événements émis par le module Centres. */
export const CENTRE_EVENT_TYPES = [
  // Navigation / découverte
  'centres_index_viewed',
  'centre_viewed',
  'centre_map_pin_clicked',
  'centre_filter_applied',

  // Carte CJS
  'cjs_card_opened',
  'cjs_card_qr_displayed',
  'cjs_card_wallet_added',
  'cjs_card_shared',

  // Ressources / réservations
  'centre_resource_viewed',
  'centre_resource_filter',
  'centre_reservation_started',
  'centre_reservation_submitted',
  'centre_reservation_validation_error',
  'centre_reservation_cancelled',
  'centre_reservation_accepted',
  'centre_reservation_refused',
  'centre_my_reservations_viewed',

  // KPI principal — fréquentation physique
  'centre_checkin',
  'centre_checkout',
  'centre_resource_picked_up',
  'centre_no_show',

  // Routing / contact
  'centre_itinerary_opened',
  'centre_phone_clicked',
  'centre_email_clicked',

  // RDV conseiller (coordination M5-agenda)
  'centre_appointment_started',

  // Dashboard analytics admin (Wave 6.3 / GUIC-388)
  'admin_analytics_centres_viewed',
  'admin_analytics_centres_csv_exported',
] as const

export type CentreEventType = (typeof CENTRE_EVENT_TYPES)[number]

const CJS_UID_RE = /^[a-zA-Z0-9_-]{1,64}$/
const CENTRE_ID_RE = /^[a-zA-Z0-9-]{1,36}$/

/**
 * Limite stricte sur la taille sérialisée des metadata : 2 KB.
 * Au-delà, on rejette (anti-flood DB + protection coût stockage).
 */
export const CENTRE_EVENT_METADATA_MAX_BYTES = 2048

export class CentreEventMetadataTooLarge extends Error {
  constructor(public bytes: number) {
    super(`Metadata size ${bytes} bytes > ${CENTRE_EVENT_METADATA_MAX_BYTES}`)
    this.name = 'CentreEventMetadataTooLarge'
  }
}

/** Schéma Zod pour le body de `POST /api/v1/track` + helper interne. */
export const CentreEventInputSchema = z.object({
  type:     z.enum(CENTRE_EVENT_TYPES),
  metadata: z.record(z.unknown()).optional(),
  centreId: z.string().regex(CENTRE_ID_RE).optional(),
  cjsUid:   z.string().regex(CJS_UID_RE).optional(),
})

export type CentreEventInput = z.infer<typeof CentreEventInputSchema>

/**
 * Insère un événement KPI dans `centre_events`.
 * - Fail-soft : log warning si Prisma throw, ne propage pas l'erreur.
 * - Throw `CentreEventMetadataTooLarge` si metadata > 2 KB (sécurité).
 *
 * Usage côté serveur (route handler ou server component) :
 *
 *   await trackCentreEvent({
 *     type:     'centre_viewed',
 *     centreId: centre.id,
 *     cjsUid:   session?.cjsUid,
 *     metadata: { source: 'map_pin' },
 *   })
 */
export async function trackCentreEvent(input: CentreEventInput): Promise<void> {
  // Re-validation Zod défensive (au cas où le caller n'aurait pas parsé)
  const parsed = CentreEventInputSchema.parse(input)

  // Vérification taille metadata (sérialisée)
  if (parsed.metadata !== undefined) {
    const serialized = JSON.stringify(parsed.metadata)
    const bytes = Buffer.byteLength(serialized, 'utf-8')
    if (bytes > CENTRE_EVENT_METADATA_MAX_BYTES) {
      throw new CentreEventMetadataTooLarge(bytes)
    }
  }

  try {
    await prisma.centreEvent.create({
      data: {
        type:     parsed.type,
        centreId: parsed.centreId ?? null,
        cjsUid:   parsed.cjsUid   ?? null,
        metadata: (parsed.metadata as object | undefined) ?? undefined,
      },
    })
  } catch (err) {
    // Fail-soft — un crash DB ne doit jamais bloquer le user.
    logger.warn('[centre-events] insertion échouée — fail-soft', {
      type:  parsed.type,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
