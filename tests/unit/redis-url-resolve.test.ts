/**
 * @jest-environment node
 *
 * GUIC-623 — Résolution de l'URL Redis depuis l'environnement.
 *
 * L'infra CJS fournit les paramètres Redis en variables DISCRÈTES (`REDIS_HOST`, `REDIS_PORT`,
 * `REDIS_USERNAME`, `REDIS_PASSWORD`), alors que le code ne lisait que `REDIS_URL` avec un repli
 * silencieux sur `redis://localhost:6379`. En production, ce repli désigne le conteneur lui-même,
 * où rien n'écoute : `rate-limit.ts` n'ayant aucun `try/catch`, l'exception remonte et TOUS les
 * endpoints publics répondent 500.
 *
 * Même classe de bug que GUIC-565 (l'infra nomme les clés S3 autrement que le SDK AWS) : on
 * tolère donc les DEUX formes, `REDIS_URL` restant prioritaire pour ne rien changer à
 * l'existant (CI, e2e, docker-compose local).
 */
import { resolveRedisUrl } from '@/lib/redis'

describe('GUIC-623 — resolveRedisUrl', () => {
  it('utilise REDIS_URL tel quel quand il est fourni', () => {
    expect(resolveRedisUrl({ REDIS_URL: 'redis://u:p@ailleurs:6380' })).toBe(
      'redis://u:p@ailleurs:6380',
    )
  })

  it('construit l’URL depuis les variables discrètes de l’infra', () => {
    expect(
      resolveRedisUrl({
        REDIS_HOST:     'redis_cjs',
        REDIS_PORT:     '6379',
        REDIS_USERNAME: 'guichet',
        REDIS_PASSWORD: 'secret',
      }),
    ).toBe('redis://guichet:secret@redis_cjs:6379')
  })

  it('REDIS_URL est PRIORITAIRE sur les variables discrètes', () => {
    expect(
      resolveRedisUrl({
        REDIS_URL:      'redis://prioritaire:6379',
        REDIS_HOST:     'redis_cjs',
        REDIS_PASSWORD: 'secret',
      }),
    ).toBe('redis://prioritaire:6379')
  })

  it('encode les caractères spéciaux du mot de passe ACL', () => {
    // Un mot de passe contenant « @ », « : » ou « / » casserait l'URL sans encodage —
    // le client se connecterait au mauvais hôte, ou échouerait sans raison lisible.
    expect(
      resolveRedisUrl({
        REDIS_HOST:     'redis_cjs',
        REDIS_USERNAME: 'guichet',
        REDIS_PASSWORD: 'p@ss:w/rd',
      }),
    ).toBe('redis://guichet:p%40ss%3Aw%2Frd@redis_cjs:6379')
  })

  it('port par défaut 6379 si REDIS_PORT est absent', () => {
    expect(resolveRedisUrl({ REDIS_HOST: 'redis_cjs', REDIS_PASSWORD: 'x' })).toBe(
      'redis://:x@redis_cjs:6379',
    )
  })

  it('accepte un hôte sans authentification (Redis local sans ACL)', () => {
    expect(resolveRedisUrl({ REDIS_HOST: 'localhost', REDIS_PORT: '6380' })).toBe(
      'redis://localhost:6380',
    )
  })

  it('hors production : repli sur localhost quand rien n’est fourni', () => {
    expect(resolveRedisUrl({ NODE_ENV: 'development' })).toBe('redis://localhost:6379')
    expect(resolveRedisUrl({})).toBe('redis://localhost:6379')
  })

  it('EN PRODUCTION : lève plutôt que de servir avec un Redis mort', () => {
    // Sûr par défaut, comme src/lib/security/prod-guards.ts : mieux vaut un refus bruyant au
    // démarrage qu'un service qui répond 500 sur tous ses endpoints publics.
    expect(() => resolveRedisUrl({ NODE_ENV: 'production' })).toThrow(/REDIS_URL|REDIS_HOST/)
  })
})
