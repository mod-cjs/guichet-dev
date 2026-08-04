/**
 * GUIC-695 — pseudonymisation du sujet de consultation (CDP).
 *
 * Le sujet haché est soit le `cjs_uid`, soit `IP|user-agent` pour un visiteur anonyme.
 * Ce hash part dans l'entrepôt Data Hub via le flux `consultations` : quiconque y accède
 * doit être incapable de retrouver l'adresse IP.
 *
 * Trois défauts cumulés le rendaient réversible :
 *   1. `.env.example` livre `CONSULTATION_HASH_SALT=""`, et `??` ne rattrape PAS la chaîne
 *      vide — le sel valait donc la chaîne vide sur tout déploiement issu du patron.
 *   2. Le sel de repli est une constante publiée dans le dépôt : un sel connu ne sale rien.
 *   3. Un seul tour de SHA-256, sans clé. Mesuré pendant la campagne d'épreuve : 3,3 M de
 *      hachages/s sur un seul cœur en Node, soit ~21 minutes pour énumérer les 2^32 IPv4
 *      pour un user-agent donné — quelques secondes sur GPU.
 *
 * Le remède est un HMAC à clé secrète obligatoire : sans la clé, l'attaque hors ligne
 * n'est plus possible même si l'entrepôt entier fuite.
 */
import { createHash, createHmac } from 'node:crypto'

// Le module importe prisma/redis/logger pour l'écriture des consultations ; ici seul le
// hachage est sous test. Sans ces mocks, charger le module en NODE_ENV=production ferait
// jeter le garde Redis (`resolveRedisUrl`) avant même d'atteindre la garde de clé HMAC.
jest.mock('@/lib/prisma', () => ({ prisma: {} }))
jest.mock('@/lib/redis', () => ({ redis: { set: jest.fn() } }))
jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

const SUJET = '41.82.14.7|Mozilla/5.0 (Linux; Android 13) Chrome/120'

const ENV_ORIGINE = { ...process.env }
afterEach(() => {
  process.env = { ...ENV_ORIGINE }
})

/**
 * Recharge le module avec un environnement donné. La clé est lue PARESSEUSEMENT à chaque
 * appel — c'est volontaire, une lecture au chargement du module rendrait la rotation
 * impossible sans redémarrage. L'environnement doit donc rester posé pendant l'appel, et
 * n'est restauré qu'en `afterEach`.
 */
async function charger(env: Record<string, string | undefined>) {
  jest.resetModules()
  for (const [cle, valeur] of Object.entries(env)) {
    if (valeur === undefined) delete process.env[cle]
    else process.env[cle] = valeur
  }
  return await import('@/lib/analytics/consultations')
}

describe('GUIC-695 — le hachage du sujet n\'est pas réversible', () => {
  it('n\'est jamais un SHA-256 nu, même avec un sel vide', async () => {
    // Le cas réel : `.env.example` pose la chaîne vide, que `??` laisse passer.
    const { hashSujet } = await charger({
      CONSULTATION_HASH_SALT: '',
      CONSULTATION_HASH_KEY: 'cle-de-test-0123456789abcdef',
    })
    expect(hashSujet(SUJET)).not.toBe(createHash('sha256').update(`:${SUJET}`).digest('hex'))
  })

  it('est un HMAC-SHA256 de la clé configurée', async () => {
    const cle = 'cle-de-test-0123456789abcdef'
    const { hashSujet } = await charger({ CONSULTATION_HASH_KEY: cle })
    expect(hashSujet(SUJET)).toBe(createHmac('sha256', cle).update(SUJET).digest('hex'))
  })

  it('change de valeur quand la clé change — la rotation est possible', async () => {
    const { hashSujet } = await charger({ CONSULTATION_HASH_KEY: 'cle-a-0123456789abcdef' })
    const avant = hashSujet(SUJET)
    process.env.CONSULTATION_HASH_KEY = 'cle-b-0123456789abcdef'
    expect(hashSujet(SUJET)).not.toBe(avant)
  })

  it('refuse de démarrer en production sans clé', async () => {
    // Une clé absente en production produirait des pseudonymes réversibles sans
    // qu'aucun signal ne le révèle. Le refus est la seule protection.
    const { hashSujet } = await charger({
      NODE_ENV: 'production',
      CONSULTATION_HASH_KEY: undefined,
      CONSULTATION_HASH_SALT: '',
    })
    expect(() => hashSujet(SUJET)).toThrow(/CONSULTATION_HASH_KEY/)
  })

  it('refuse aussi une clé vide ou blanche en production', async () => {
    const { hashSujet } = await charger({ NODE_ENV: 'production', CONSULTATION_HASH_KEY: '   ' })
    expect(() => hashSujet(SUJET)).toThrow(/CONSULTATION_HASH_KEY/)
  })

  it('reste utilisable hors production sans clé, pour ne pas bloquer le développement', async () => {
    const { hashSujet } = await charger({ NODE_ENV: 'test', CONSULTATION_HASH_KEY: undefined })
    expect(hashSujet(SUJET)).toMatch(/^[0-9a-f]{64}$/)
  })
})
