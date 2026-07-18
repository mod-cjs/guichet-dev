/**
 * @jest-environment node
 *
 * GUIC-564 — Garde-fous de production.
 *
 * Faille constatée : `/api/dev/login` pose une session SANS passer par le SSO. Sa garde
 * actuelle est `NODE_ENV === 'production' && ALLOW_DEV_LOGIN !== 'true'` → il suffit de
 * `ALLOW_DEV_LOGIN=true` pour ROUVRIR la connexion sans SSO en production. Or c'est
 * exactement ce que positionne notre docker-compose de développement — celui-là même que
 * le CD déploierait. Le commentaire du code affirmait « en prod réelle, ce flag n'est
 * jamais positionné » : une espérance, pas une garantie.
 *
 * Règle retenue (sûre par défaut) :
 *   - hors production          → autorisé (dev local classique)
 *   - en production            → autorisé UNIQUEMENT si APP_ENV=local ET ALLOW_DEV_LOGIN=true
 *                                (image de prod exécutée sur un poste de dev)
 *   - et dans TOUS les cas     → refus de démarrer si la connexion sans SSO est activable
 *                                alors que l'URL publique n'est PAS locale. C'est le filet
 *                                qui attrape le scénario « on a déployé le compose de dev ».
 */
import { devLoginAutorise, assertConfigurationProduction } from '@/lib/security/prod-guards'

describe('GUIC-564 — devLoginAutorise', () => {
  it('autorise la connexion de dev hors production', () => {
    expect(devLoginAutorise({ NODE_ENV: 'development' })).toBe(true)
    expect(devLoginAutorise({ NODE_ENV: 'test' })).toBe(true)
  })

  it('REFUSE en production quand rien n’est positionné', () => {
    expect(devLoginAutorise({ NODE_ENV: 'production' })).toBe(false)
  })

  it('REFUSE en production même si ALLOW_DEV_LOGIN=true (la faille d’origine)', () => {
    expect(devLoginAutorise({ NODE_ENV: 'production', ALLOW_DEV_LOGIN: 'true' })).toBe(false)
  })

  it('REFUSE en production si APP_ENV=production, quoi qu’il arrive', () => {
    expect(
      devLoginAutorise({ NODE_ENV: 'production', APP_ENV: 'production', ALLOW_DEV_LOGIN: 'true' }),
    ).toBe(false)
  })

  it('autorise l’image de prod exécutée en local (APP_ENV=local + ALLOW_DEV_LOGIN=true)', () => {
    expect(
      devLoginAutorise({ NODE_ENV: 'production', APP_ENV: 'local', ALLOW_DEV_LOGIN: 'true' }),
    ).toBe(true)
  })

  it('exige les DEUX variables : APP_ENV=local seul ne suffit pas', () => {
    expect(devLoginAutorise({ NODE_ENV: 'production', APP_ENV: 'local' })).toBe(false)
  })
})

describe('GUIC-564 — assertConfigurationProduction (refus de démarrage)', () => {
  it('démarre sans broncher sur une configuration de production saine', () => {
    expect(() =>
      assertConfigurationProduction({
        NODE_ENV: 'production',
        APP_ENV: 'production',
        NEXTAUTH_URL: 'https://guichet.consortiumjeunessesenegal.org',
      }),
    ).not.toThrow()
  })

  it('démarre sur un poste de dev, image de prod, URL locale', () => {
    expect(() =>
      assertConfigurationProduction({
        NODE_ENV: 'production',
        APP_ENV: 'local',
        ALLOW_DEV_LOGIN: 'true',
        NEXTAUTH_URL: 'http://localhost:3000',
      }),
    ).not.toThrow()
  })

  it('REFUSE DE DÉMARRER si la connexion sans SSO est activable sur une URL publique', () => {
    // Le scénario redouté : le compose de DEV déployé sur le serveur.
    expect(() =>
      assertConfigurationProduction({
        NODE_ENV: 'production',
        APP_ENV: 'local',
        ALLOW_DEV_LOGIN: 'true',
        NEXTAUTH_URL: 'https://guichet.consortiumjeunessesenegal.org',
      }),
    ).toThrow(/sans SSO/i)
  })
})
