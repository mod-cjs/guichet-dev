/**
 * @jest-environment node
 *
 * GUIC-140 — lien magique de liaison numéro WhatsApp ↔ cjs_uid.
 */
import {
  createLinkToken,
  consumeLinkToken,
  bindWhatsAppNumber,
  unbindWhatsAppNumber,
  isUnlinkKeyword,
  toE164,
  buildMagicLinkUrl,
  withinLinkRateLimit,
  linkConfirmationMessage,
  unlinkConfirmationMessage,
  LINK_TTL_S,
  LINK_MAX_PER_HOUR,
} from '@/lib/whatsapp/magic-link'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/redis', () => ({
  redis: { set: jest.fn(), getdel: jest.fn(), incr: jest.fn(), expire: jest.fn() },
}))
jest.mock('@/lib/prisma', () => ({
  prisma: { conversationWhatsApp: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() } },
}))
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  // Vrai hashId : n'échoit jamais l'entrée en clair. Le mock reflète cette propriété.
  hashId: (s: string) => 'sha256_' + String(s).length,
}))
import { logger } from '@/lib/logger'

const mockRedis = redis as jest.Mocked<typeof redis>
const mockUpsert = prisma.conversationWhatsApp.upsert as jest.Mock
const mockFindUnique = prisma.conversationWhatsApp.findUnique as jest.Mock
const mockUpdate = prisma.conversationWhatsApp.update as jest.Mock
const mockWarn = logger.warn as jest.Mock

beforeEach(() => jest.clearAllMocks())

describe('createLinkToken', () => {
  it('génère un token hex 64 caractères et le stocke avec TTL 10 min', async () => {
    mockRedis.set.mockResolvedValue('OK')
    const token = await createLinkToken('+221770000000')
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(mockRedis.set).toHaveBeenCalledWith(
      `guichet:whatsapp:link:${token}`,
      '+221770000000',
      'EX',
      LINK_TTL_S,
    )
    expect(LINK_TTL_S).toBe(600)
  })
})

describe('consumeLinkToken (usage unique)', () => {
  it('retourne le téléphone et supprime le token de façon atomique (getdel)', async () => {
    mockRedis.getdel.mockResolvedValue('+221770000000')
    const phone = await consumeLinkToken('abc')
    expect(phone).toBe('+221770000000')
    expect(mockRedis.getdel).toHaveBeenCalledWith('guichet:whatsapp:link:abc')
  })

  it('retourne null si le token est expiré ou inconnu', async () => {
    mockRedis.getdel.mockResolvedValue(null)
    expect(await consumeLinkToken('inconnu')).toBeNull()
  })

  it('retourne null sans toucher Redis si le token est vide', async () => {
    expect(await consumeLinkToken('')).toBeNull()
    expect(mockRedis.getdel).not.toHaveBeenCalled()
  })
})

describe('toE164', () => {
  it('préfixe + quand il est absent', () => {
    expect(toE164('221770000000')).toBe('+221770000000')
  })
  it('laisse inchangé un numéro déjà en E.164', () => {
    expect(toE164('+221770000000')).toBe('+221770000000')
  })
  it('convertit un numéro local sénégalais 9 chiffres', () => {
    expect(toE164('770000000')).toBe('+221770000000')
  })
  it('gère le préfixe 00', () => {
    expect(toE164('00221770000000')).toBe('+221770000000')
  })
})

describe('bindWhatsAppNumber', () => {
  it('upsert la conversation avec cjsUid + linkedAt (create et update)', async () => {
    mockFindUnique.mockResolvedValue(null)
    await bindWhatsAppNumber('+221770000000', 'u-1')
    const arg = mockUpsert.mock.calls[0][0]
    expect(arg.where).toEqual({ telephone: '+221770000000' })
    expect(arg.create).toMatchObject({ telephone: '+221770000000', cjsUid: 'u-1' })
    expect(arg.create.linkedAt).toBeInstanceOf(Date)
    expect(arg.update).toMatchObject({ cjsUid: 'u-1' })
    expect(arg.update.linkedAt).toBeInstanceOf(Date)
  })

  it('première liaison (aucun binding existant) → pas de journal de re-lien', async () => {
    mockFindUnique.mockResolvedValue(null)
    await bindWhatsAppNumber('+221770000000', 'u-1')
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('re-lien du MÊME compte → idempotent, pas de journal', async () => {
    mockFindUnique.mockResolvedValue({ cjsUid: 'u-1' })
    await bindWhatsAppNumber('+221770000000', 'u-1')
    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockUpsert).toHaveBeenCalled()
  })

  it('re-lien vers un AUTRE compte → écrase (dernier gagnant) ET journalise (CDP, uids hachés)', async () => {
    mockFindUnique.mockResolvedValue({ cjsUid: 'uid-alpha-9999' })
    await bindWhatsAppNumber('+221770000000', 'uid-beta-8888')
    expect(mockUpsert).toHaveBeenCalled()
    expect(mockWarn).toHaveBeenCalledTimes(1)
    const [, meta] = mockWarn.mock.calls[0]
    // Aucun identifiant NI téléphone en clair dans les logs (valeurs hachées).
    expect(JSON.stringify(meta)).not.toContain('uid-alpha-9999')
    expect(JSON.stringify(meta)).not.toContain('uid-beta-8888')
    expect(JSON.stringify(meta)).not.toContain('+221770000000')
  })
})

describe('buildMagicLinkUrl', () => {
  it('construit /api/whatsapp/link?token=<token>', () => {
    expect(buildMagicLinkUrl('https://g.sn', 'tok')).toBe(
      'https://g.sn/api/whatsapp/link?token=tok',
    )
  })
  it('supprime le slash final de la base', () => {
    expect(buildMagicLinkUrl('https://g.sn/', 'tok')).toBe(
      'https://g.sn/api/whatsapp/link?token=tok',
    )
  })
})

describe('withinLinkRateLimit', () => {
  it('autorise sous le plafond et pose le TTL au premier appel', async () => {
    mockRedis.incr.mockResolvedValue(1)
    expect(await withinLinkRateLimit('+221770000000')).toBe(true)
    expect(mockRedis.expire).toHaveBeenCalledWith(
      'guichet:whatsapp:link:throttle:+221770000000',
      3600,
    )
  })
  it('refuse au-delà du plafond horaire', async () => {
    mockRedis.incr.mockResolvedValue(LINK_MAX_PER_HOUR + 1)
    expect(await withinLinkRateLimit('+221770000000')).toBe(false)
  })
  it('ne repose pas le TTL aux appels suivants', async () => {
    mockRedis.incr.mockResolvedValue(2)
    await withinLinkRateLimit('+221770000000')
    expect(mockRedis.expire).not.toHaveBeenCalled()
  })
})

describe('linkConfirmationMessage', () => {
  it('mentionne que le compte est lié', () => {
    expect(linkConfirmationMessage().toLowerCase()).toContain('lié')
  })
})

describe('isUnlinkKeyword (opt-out WhatsApp)', () => {
  it.each(['STOP', 'stop', ' Stop ', 'DÉLIER', 'delier', 'Délier'])(
    'reconnaît « %s » comme demande de déliaison',
    (kw) => expect(isUnlinkKeyword(kw)).toBe(true),
  )
  it.each(['bonjour', 'stopper la recherche', 'je veux délier mon compte demain', ''])(
    'ne déclenche pas sur « %s »',
    (kw) => expect(isUnlinkKeyword(kw)).toBe(false),
  )
})

describe('unbindWhatsAppNumber', () => {
  it('détache l’identité (cjsUid + linkedAt à null) sans supprimer la conversation', async () => {
    await unbindWhatsAppNumber('+221770000000')
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { telephone: '+221770000000' },
      data: { cjsUid: null, linkedAt: null },
    })
  })
})

describe('unlinkConfirmationMessage', () => {
  it('confirme la déliaison', () => {
    expect(unlinkConfirmationMessage().toLowerCase()).toContain('délié')
  })
})
