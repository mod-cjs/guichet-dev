/**
 * @jest-environment node
 *
 * GUIC-159 — Le cookie de session doit rester petit.
 *
 * POURQUOI : le SSO CJS a rencontré un dépassement de la taille des en-têtes derrière Plesk, qui
 * a exigé de surcharger les buffers nginx. La cause y est structurelle — une session Laravel
 * Passport embarque l'access token ET le refresh token dans le cookie, soit plusieurs kilo-octets.
 *
 * Le Guichet échappe à ce problème PAR CONCEPTION : `pickMinimalClaims` ne sérialise que des
 * claims légères, et les tokens SSO vivent en Redis (`token-store.ts`), jamais dans le cookie.
 * Mesuré : 629 octets dans un cas défavorable réel (nom composé, e-mail long, six rôles).
 *
 * Ce test fige cette propriété. Le jour où quelqu'un ajoutera une claim volumineuse — une
 * `photoUrl`, une liste de centres, des permissions détaillées — il l'apprendra ICI, en CI,
 * plutôt qu'en production derrière un proxy qui tronque les en-têtes.
 */
import { encodeSession } from '@/lib/auth'

/**
 * 2 Ko : quatre fois la taille observée, et un quart de la limite nginx par en-tête
 * (`large_client_header_buffers`, 8 Ko par défaut). Assez large pour ne pas gêner une évolution
 * légitime, assez serré pour attraper l'ajout d'un token ou d'une liste.
 */
const LIMITE_OCTETS = 2048

/** Cas défavorable RÉALISTE — pas un cas moyen : c'est le pire qui compte. */
function sessionDefavorable() {
  return {
    cjsUid:             '000016dd-3ec7-4d17-aa8c-7dcc58cd0835',
    nom:                'Diallo-Ndiaye',
    prenom:             'Mouhamadou Moustapha',
    email:              'mouhamadou.moustapha.diallo.ndiaye@consortiumjeunessesenegal.org',
    telephone:          '+221770000000',
    region:             'Dakar',
    roles:              ['beneficiaire', 'conseiller', 'recruteur', 'admin', 'superadmin', 'moderateur'],
    onboardingComplete: true,
    expiresAt:          Math.floor(Date.now() / 1000) + 3600,
  } as unknown as Parameters<typeof encodeSession>[0]
}

describe('GUIC-159 — taille du cookie de session', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'x'.repeat(48)
  })

  it(`reste sous ${LIMITE_OCTETS} octets dans le cas défavorable`, async () => {
    const jwt = await encodeSession(sessionDefavorable())
    expect(Buffer.byteLength(jwt)).toBeLessThan(LIMITE_OCTETS)
  })

  it('ne contient AUCUN token SSO — ils vivent en Redis, pas dans le cookie', async () => {
    // C'est la propriété qui protège réellement : un token dans le cookie ferait exploser
    // l'en-tête, comme sur le SSO. La limite de taille ci-dessus n'est que le filet.
    const jwt = await encodeSession(sessionDefavorable())
    const charge = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    for (const clef of Object.keys(charge)) {
      expect(clef.toLowerCase()).not.toMatch(/token/)
    }
  })

  it('le test lit bien un vrai JWT (garde-fou anti-faux-vert)', async () => {
    const jwt = await encodeSession(sessionDefavorable())
    expect(jwt.split('.')).toHaveLength(3)
    const charge = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    expect(charge.cjsUid).toBe('000016dd-3ec7-4d17-aa8c-7dcc58cd0835')
    expect(Buffer.byteLength(jwt)).toBeGreaterThan(200)
  })
})
