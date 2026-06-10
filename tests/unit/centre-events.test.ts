/**
 * @jest-environment node
 *
 * GUIC-351 — Tests helper `centre-events` (KPI fréquentation Lot 7).
 *
 * Anti-régression cible :
 * - Whitelist `CENTRE_EVENT_TYPES` stable (typage strict)
 * - Validation Zod du shape `{ type, metadata?, centreId?, cjsUid? }`
 * - Garde-fou métadata > 2KB (anti-flood DB)
 * - Insertion DB via Prisma (mocked)
 * - Fail-soft : DB error ne propage pas au caller
 */

import {
  CENTRE_EVENT_TYPES,
  CENTRE_EVENT_METADATA_MAX_BYTES,
  CentreEventInputSchema,
  CentreEventMetadataTooLarge,
  trackCentreEvent,
} from '@/lib/analytics/centre-events'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    centreEvent: { create: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

const { prisma } = jest.requireMock('@/lib/prisma') as {
  prisma: { centreEvent: { create: jest.Mock } }
}
const { logger } = jest.requireMock('@/lib/logger') as {
  logger: { warn: jest.Mock }
}

describe('GUIC-351 — centre-events', () => {
  beforeEach(() => {
    prisma.centreEvent.create.mockReset()
    logger.warn.mockReset()
  })

  describe('CENTRE_EVENT_TYPES whitelist', () => {
    it('contient les types KPI critiques', () => {
      expect(CENTRE_EVENT_TYPES).toContain('centre_checkin')          // KPI principal
      expect(CENTRE_EVENT_TYPES).toContain('centre_reservation_submitted')
      expect(CENTRE_EVENT_TYPES).toContain('centre_viewed')
      expect(CENTRE_EVENT_TYPES).toContain('cjs_card_qr_displayed')
    })

    it('expose au moins 20 types canoniques', () => {
      expect(CENTRE_EVENT_TYPES.length).toBeGreaterThanOrEqual(20)
    })

    it('chaque type est snake_case', () => {
      for (const t of CENTRE_EVENT_TYPES) {
        expect(t).toMatch(/^[a-z][a-z0-9_]+$/)
      }
    })
  })

  describe('CentreEventInputSchema (validation Zod)', () => {
    it('accepte un input minimal valide', () => {
      const res = CentreEventInputSchema.safeParse({ type: 'centre_viewed' })
      expect(res.success).toBe(true)
    })

    it('rejette type inconnu', () => {
      const res = CentreEventInputSchema.safeParse({ type: 'not_a_real_event' })
      expect(res.success).toBe(false)
    })

    it('accepte tous les types whitelistés', () => {
      for (const t of CENTRE_EVENT_TYPES) {
        const res = CentreEventInputSchema.safeParse({ type: t })
        expect(res.success).toBe(true)
      }
    })

    it('valide centreId format', () => {
      expect(CentreEventInputSchema.safeParse({ type: 'centre_viewed', centreId: 'abc-123' }).success).toBe(true)
      expect(CentreEventInputSchema.safeParse({ type: 'centre_viewed', centreId: 'has spaces' }).success).toBe(false)
      expect(CentreEventInputSchema.safeParse({ type: 'centre_viewed', centreId: 'a'.repeat(40) }).success).toBe(false)
    })

    it('accepte cjsUid alphanum_- jusqu\'à 64 chars', () => {
      expect(CentreEventInputSchema.safeParse({ type: 'centre_viewed', cjsUid: 'a'.repeat(64) }).success).toBe(true)
      expect(CentreEventInputSchema.safeParse({ type: 'centre_viewed', cjsUid: 'a'.repeat(65) }).success).toBe(false)
    })
  })

  describe('trackCentreEvent', () => {
    it('insère en DB avec mapping correct', async () => {
      prisma.centreEvent.create.mockResolvedValue({ id: BigInt(1) })
      await trackCentreEvent({
        type:     'centre_viewed',
        centreId: 'tamba-001',
        cjsUid:   'user-1',
        metadata: { source: 'map_pin' },
      })
      expect(prisma.centreEvent.create).toHaveBeenCalledWith({
        data: {
          type:     'centre_viewed',
          centreId: 'tamba-001',
          cjsUid:   'user-1',
          metadata: { source: 'map_pin' },
        },
      })
    })

    it('insère avec centreId/cjsUid à null si non fournis', async () => {
      prisma.centreEvent.create.mockResolvedValue({ id: BigInt(2) })
      await trackCentreEvent({ type: 'centres_index_viewed' })
      expect(prisma.centreEvent.create).toHaveBeenCalledWith({
        data: {
          type:     'centres_index_viewed',
          centreId: null,
          cjsUid:   null,
          metadata: undefined,
        },
      })
    })

    it('fail-soft : DB throw → ne propage pas, log warn', async () => {
      prisma.centreEvent.create.mockRejectedValue(new Error('DB unavailable'))
      await expect(trackCentreEvent({ type: 'centre_viewed' })).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(logger.warn.mock.calls[0][0]).toContain('centre-events')
    })

    it('throw CentreEventMetadataTooLarge si > 2KB', async () => {
      const big = { huge: 'x'.repeat(CENTRE_EVENT_METADATA_MAX_BYTES + 100) }
      await expect(
        trackCentreEvent({ type: 'centre_viewed', metadata: big }),
      ).rejects.toBeInstanceOf(CentreEventMetadataTooLarge)
      expect(prisma.centreEvent.create).not.toHaveBeenCalled()
    })

    it('accepte metadata exactement à la limite (≤ 2KB)', async () => {
      prisma.centreEvent.create.mockResolvedValue({ id: BigInt(3) })
      // Genère une string proche de la limite mais pas au-dessus
      const safe = { data: 'a'.repeat(CENTRE_EVENT_METADATA_MAX_BYTES - 30) }
      await expect(trackCentreEvent({ type: 'centre_viewed', metadata: safe })).resolves.toBeUndefined()
      expect(prisma.centreEvent.create).toHaveBeenCalledTimes(1)
    })

    it('throw si input invalide (re-validation défensive)', async () => {
      await expect(
        // @ts-expect-error — test runtime validation
        trackCentreEvent({ type: 'not_a_type' }),
      ).rejects.toThrow()
    })
  })
})
