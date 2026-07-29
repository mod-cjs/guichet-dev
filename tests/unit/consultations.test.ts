/**
 * @jest-environment node
 *
 * GUIC-688 — Tests du socle `consultations` (trace multicanal web / IA / WhatsApp).
 *
 * Anti-régression cible :
 * - Dédoublonnage Redis 30 min, identique sur les 3 canaux
 * - Aucune IP en clair en base (sujet toujours haché)
 * - Fail-soft : une erreur DB/Redis ne remonte jamais au callsite
 * - Cache dénormalisé (`vues`) alimenté seulement pour les entités qui en portent
 *   un, et seulement sur `consultation` (jamais sur `impression`)
 * - `RecommandationIA.vuePar` renseigné quand la vue vient d'une reco
 */

import {
  CONSULTATION_DEDUP_TTL_SECONDS,
  ConsultationInputSchema,
  canalFromSrc,
  hashSujet,
  trackConsultation,
  trackImpressions,
} from '@/lib/analytics/consultations'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    consultation:     { create: jest.fn() },
    opportunite:      { update: jest.fn() },
    ressource:        { update: jest.fn() },
    recommandationIA: { updateMany: jest.fn() },
  },
}))

jest.mock('@/lib/redis', () => ({
  redis: { set: jest.fn() },
}))

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

const { prisma } = jest.requireMock('@/lib/prisma') as {
  prisma: {
    consultation:     { create: jest.Mock }
    opportunite:      { update: jest.Mock }
    ressource:        { update: jest.Mock }
    recommandationIA: { updateMany: jest.Mock }
  }
}
const { redis }  = jest.requireMock('@/lib/redis')  as { redis: { set: jest.Mock } }
const { logger } = jest.requireMock('@/lib/logger') as { logger: { warn: jest.Mock } }

/** Récupère le `data` du dernier `consultation.create`. */
function dernierCreate(): Record<string, unknown> {
  const call = prisma.consultation.create.mock.calls.at(-1)
  return (call?.[0] as { data: Record<string, unknown> }).data
}

describe('GUIC-688 — socle consultations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Par défaut : première vue (SET NX réussit).
    redis.set.mockResolvedValue('OK')
  })

  describe('hashSujet', () => {
    it('produit un SHA-256 hexadécimal de 64 caractères', () => {
      expect(hashSujet('192.168.1.1')).toMatch(/^[a-f0-9]{64}$/)
    })

    it('est déterministe pour un même sujet', () => {
      expect(hashSujet('cjs-uid-42')).toBe(hashSujet('cjs-uid-42'))
    })

    it('sépare deux sujets distincts', () => {
      expect(hashSujet('cjs-uid-42')).not.toBe(hashSujet('cjs-uid-43'))
    })
  })

  describe('canalFromSrc', () => {
    it('mappe `ia` sur le canal chat IA', () => {
      expect(canalFromSrc('ia')).toBe('ia_web')
    })

    it('mappe `wa` sur le canal WhatsApp', () => {
      expect(canalFromSrc('wa')).toBe('whatsapp')
    })

    it('retombe sur `web` pour absent ou inconnu', () => {
      expect(canalFromSrc(undefined)).toBe('web')
      expect(canalFromSrc(null)).toBe('web')
      expect(canalFromSrc('n-importe-quoi')).toBe('web')
    })
  })

  describe('ConsultationInputSchema', () => {
    it('accepte un input minimal valide', () => {
      const res = ConsultationInputSchema.safeParse({
        typeEntite: 'opportunite',
        entiteId:   'opp-1',
        typeEvent:  'consultation',
        canal:      'web',
      })
      expect(res.success).toBe(true)
    })

    it('rejette une entité hors whitelist', () => {
      const res = ConsultationInputSchema.safeParse({
        typeEntite: 'article',
        entiteId:   'x',
        typeEvent:  'consultation',
        canal:      'web',
      })
      expect(res.success).toBe(false)
    })

    it('rejette un canal hors whitelist', () => {
      const res = ConsultationInputSchema.safeParse({
        typeEntite: 'centre',
        entiteId:   'c-1',
        typeEvent:  'consultation',
        canal:      'sms',
      })
      expect(res.success).toBe(false)
    })
  })

  describe('trackConsultation — insertion', () => {
    it('insère une ligne avec le canal et l’entité fournis', async () => {
      await trackConsultation({
        typeEntite: 'evenement',
        entiteId:   'ev-1',
        typeEvent:  'consultation',
        canal:      'ia_web',
        cjsUid:     'uid-1',
        origine:    'reco_ia',
        sessionId:  'sess-1',
      })

      expect(prisma.consultation.create).toHaveBeenCalledTimes(1)
      expect(dernierCreate()).toMatchObject({
        typeEntite: 'evenement',
        entiteId:   'ev-1',
        typeEvent:  'consultation',
        canal:      'ia_web',
        cjsUid:     'uid-1',
        origine:    'reco_ia',
        sessionId:  'sess-1',
      })
    })

    it('hache le cjsUid comme sujet quand l’utilisateur est connecté', async () => {
      await trackConsultation({
        typeEntite: 'ressource',
        entiteId:   'res-1',
        typeEvent:  'consultation',
        canal:      'web',
        cjsUid:     'uid-1',
        ip:         '10.0.0.1',
      })

      expect(dernierCreate().sujetHash).toBe(hashSujet('uid-1'))
    })

    it('n’écrit JAMAIS l’IP en clair et laisse cjsUid null pour un anonyme', async () => {
      await trackConsultation({
        typeEntite: 'opportunite',
        entiteId:   'opp-1',
        typeEvent:  'consultation',
        canal:      'web',
        ip:         '41.82.13.7',
      })

      const data = dernierCreate()
      expect(data.cjsUid).toBeNull()
      expect(data.sujetHash).toBe(hashSujet('41.82.13.7'))
      expect(JSON.stringify(data)).not.toContain('41.82.13.7')
    })
  })

  describe('trackConsultation — dédoublonnage', () => {
    it('pose une garde Redis en SET NX avec un TTL de 30 min', async () => {
      await trackConsultation({
        typeEntite: 'centre',
        entiteId:   'centre-1',
        typeEvent:  'consultation',
        canal:      'web',
        cjsUid:     'uid-1',
      })

      expect(CONSULTATION_DEDUP_TTL_SECONDS).toBe(1800)
      const [cle, valeur, ex, ttl, nx] = redis.set.mock.calls[0] as string[]
      expect(cle).toContain('centre-1')
      expect(valeur).toBe('1')
      expect(ex).toBe('EX')
      expect(Number(ttl)).toBe(1800)
      expect(nx).toBe('NX')
    })

    it('n’insère pas deux fois le même couple (sujet, entité) dans la fenêtre', async () => {
      redis.set.mockResolvedValue(null) // clé déjà posée

      await trackConsultation({
        typeEntite: 'opportunite',
        entiteId:   'opp-1',
        typeEvent:  'consultation',
        canal:      'web',
        cjsUid:     'uid-1',
      })

      expect(prisma.consultation.create).not.toHaveBeenCalled()
      expect(prisma.opportunite.update).not.toHaveBeenCalled()
    })

    it('sépare impression et consultation dans la clé de garde', async () => {
      await trackConsultation({
        typeEntite: 'opportunite', entiteId: 'opp-1', typeEvent: 'impression', canal: 'ia_web', cjsUid: 'uid-1',
      })
      await trackConsultation({
        typeEntite: 'opportunite', entiteId: 'opp-1', typeEvent: 'consultation', canal: 'web', cjsUid: 'uid-1',
      })

      const [cle1] = redis.set.mock.calls[0] as string[]
      const [cle2] = redis.set.mock.calls[1] as string[]
      expect(cle1).not.toBe(cle2)
      expect(prisma.consultation.create).toHaveBeenCalledTimes(2)
    })
  })

  describe('trackConsultation — cache dénormalisé `vues`', () => {
    it('incrémente le compteur de l’opportunité sur une consultation', async () => {
      await trackConsultation({
        typeEntite: 'opportunite', entiteId: 'opp-1', typeEvent: 'consultation', canal: 'web', cjsUid: 'uid-1',
      })

      expect(prisma.opportunite.update).toHaveBeenCalledWith({
        where: { id: 'opp-1' },
        data:  { vues: { increment: 1 } },
      })
    })

    it('incrémente le compteur de la ressource sur une consultation', async () => {
      await trackConsultation({
        typeEntite: 'ressource', entiteId: 'res-1', typeEvent: 'consultation', canal: 'web', cjsUid: 'uid-1',
      })

      expect(prisma.ressource.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data:  { vues: { increment: 1 } },
      })
    })

    it('n’incrémente aucun compteur sur une impression', async () => {
      await trackConsultation({
        typeEntite: 'opportunite', entiteId: 'opp-1', typeEvent: 'impression', canal: 'ia_web', cjsUid: 'uid-1',
      })

      expect(prisma.consultation.create).toHaveBeenCalledTimes(1)
      expect(prisma.opportunite.update).not.toHaveBeenCalled()
    })

    it('ne touche à rien pour une entité sans compteur', async () => {
      await trackConsultation({
        typeEntite: 'livre', entiteId: 'livre-1', typeEvent: 'consultation', canal: 'web', cjsUid: 'uid-1',
      })

      expect(prisma.consultation.create).toHaveBeenCalledTimes(1)
      expect(prisma.opportunite.update).not.toHaveBeenCalled()
      expect(prisma.ressource.update).not.toHaveBeenCalled()
    })
  })

  describe('trackConsultation — RecommandationIA.vuePar', () => {
    it('marque les recos non vues quand la vue vient d’une reco', async () => {
      await trackConsultation({
        typeEntite: 'opportunite', entiteId: 'opp-1', typeEvent: 'consultation',
        canal: 'ia_web', cjsUid: 'uid-1', origine: 'reco_ia',
      })

      expect(prisma.recommandationIA.updateMany).toHaveBeenCalledTimes(1)
      const arg = prisma.recommandationIA.updateMany.mock.calls[0][0] as {
        where: Record<string, unknown>
        data:  Record<string, unknown>
      }
      expect(arg.where).toMatchObject({ cjsUid: 'uid-1', opportuniteId: 'opp-1', vuePar: null })
      expect(arg.data.vuePar).toBeInstanceOf(Date)
    })

    it('ne marque rien pour une origine autre', async () => {
      await trackConsultation({
        typeEntite: 'opportunite', entiteId: 'opp-1', typeEvent: 'consultation',
        canal: 'web', cjsUid: 'uid-1', origine: 'recherche',
      })

      expect(prisma.recommandationIA.updateMany).not.toHaveBeenCalled()
    })

    it('ne marque rien pour un anonyme', async () => {
      await trackConsultation({
        typeEntite: 'opportunite', entiteId: 'opp-1', typeEvent: 'consultation',
        canal: 'web', ip: '10.0.0.1', origine: 'reco_ia',
      })

      expect(prisma.recommandationIA.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('trackConsultation — fail-soft', () => {
    it('n’échoue pas si l’insertion Prisma throw', async () => {
      prisma.consultation.create.mockRejectedValue(new Error('DB down'))

      await expect(
        trackConsultation({ typeEntite: 'centre', entiteId: 'c-1', typeEvent: 'consultation', canal: 'web' }),
      ).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalled()
    })

    it('n’échoue pas si Redis throw', async () => {
      redis.set.mockRejectedValue(new Error('Redis down'))

      await expect(
        trackConsultation({ typeEntite: 'centre', entiteId: 'c-1', typeEvent: 'consultation', canal: 'web' }),
      ).resolves.toBeUndefined()
    })

    it('n’échoue pas si l’input est invalide', async () => {
      await expect(
        // @ts-expect-error — input volontairement invalide (robustesse au callsite)
        trackConsultation({ typeEntite: 'article', entiteId: 'x', typeEvent: 'consultation', canal: 'web' }),
      ).resolves.toBeUndefined()
      expect(prisma.consultation.create).not.toHaveBeenCalled()
    })

    it('insère quand même la consultation si l’incrément du cache échoue', async () => {
      prisma.opportunite.update.mockRejectedValue(new Error('row locked'))

      await trackConsultation({
        typeEntite: 'opportunite', entiteId: 'opp-1', typeEvent: 'consultation', canal: 'web', cjsUid: 'uid-1',
      })

      expect(prisma.consultation.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('trackImpressions', () => {
    it('émet une impression par identifiant', async () => {
      await trackImpressions(['opp-1', 'opp-2', 'opp-3'], {
        typeEntite: 'opportunite',
        canal:      'whatsapp',
        cjsUid:     'uid-1',
        sessionId:  'sess-1',
      })

      expect(prisma.consultation.create).toHaveBeenCalledTimes(3)
      expect(dernierCreate()).toMatchObject({
        typeEntite: 'opportunite',
        entiteId:   'opp-3',
        typeEvent:  'impression',
        canal:      'whatsapp',
      })
    })

    it('ne fait rien sur une liste vide', async () => {
      await trackImpressions([], { typeEntite: 'ressource', canal: 'ia_web' })
      expect(prisma.consultation.create).not.toHaveBeenCalled()
    })
  })
})
