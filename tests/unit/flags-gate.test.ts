/**
 * @jest-environment node
 *
 * GUIC-706 — Gate des fonctionnalités masquées (lot 3).
 *
 * Premier point où une bascule produit un effet réel. Trois exigences s'y croisent :
 *   - INVISIBILITÉ (§2.2) — la réponse doit être indiscernable d'une route inexistante.
 *   - ASYMÉTRIE (§2.1) — l'administration passe, avec la vraie page.
 *   - FACES (§5.4) — seuls les publics listés dans `closes` sont fermés.
 *
 * Et une exception dure : webhooks et tâches planifiées ne doivent JAMAIS recevoir de 404.
 */
const mockGetFlags = jest.fn()
jest.mock('@/lib/flags', () => ({ getFlags: () => mockGetFlags() }))

const mockRecordBlock = jest.fn()
jest.mock('@/lib/flags/metrics', () => ({ recordFlagBlock: (...a: unknown[]) => mockRecordBlock(...a) }))

const mockAUnEngagement = jest.fn()
jest.mock('@/lib/flags/engagements', () => ({
  aUnEngagement: (...a: unknown[]) => mockAUnEngagement(...a),
}))

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

import { NextRequest } from 'next/server'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { gateFlags, CIBLE_MUETTE } from '@/lib/flags/gate'
import { catalogDefaults, FEATURE_FLAGS } from '@/lib/flags/catalog'

/** Un flag qui ferme les jeunes, avec une route utilisateur et une fermeture muette. */
const MUET = FEATURE_FLAGS.find(
  (f) => f.silentClose && f.closes.includes('beneficiaire') && f.userRoutes.length > 0,
)!
/** Un flag d'espace professionnel : fermeture explicite. */
const EXPLICITE = FEATURE_FLAGS.find((f) => !f.silentClose && f.userRoutes.length > 0)!

const req = (path: string) => new NextRequest(`http://localhost${path}`)
const masque = (key: string) => ({ ...catalogDefaults(), [key]: false })

beforeEach(() => {
  jest.clearAllMocks()
  mockGetFlags.mockResolvedValue(catalogDefaults())
  mockGetSession.mockResolvedValue({ cjsUid: 'u1', roles: ['beneficiaire'] })
  mockRecordBlock.mockResolvedValue(undefined)
  mockAUnEngagement.mockResolvedValue(false)
})

describe('laisser passer', () => {
  it('ne touche pas une route hors catalogue', async () => {
    await expect(gateFlags(req('/auth/connexion'))).resolves.toBeNull()
  })

  it('ne touche pas une route dont le flag est ouvert', async () => {
    await expect(gateFlags(req(MUET.userRoutes[0]))).resolves.toBeNull()
  })

  it('n’interroge pas la session quand le flag est ouvert', async () => {
    // Le gate s'exécute à chaque requête : lire la session sur le chemin nominal en
    // ferait un coût permanent pour un cas rare.
    await gateFlags(req(MUET.userRoutes[0]))
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  it('ne ferme jamais une route d’administration', async () => {
    mockGetFlags.mockResolvedValue(masque(MUET.key))
    await expect(gateFlags(req('/admin/evenements'))).resolves.toBeNull()
  })
})

describe('fermeture muette', () => {
  beforeEach(() => mockGetFlags.mockResolvedValue(masque(MUET.key)))

  it('réécrit vers une page qui n’existe pas, sans rediriger', async () => {
    // Une redirection vers `/indisponible` changerait l'URL et révélerait le dispositif.
    // La réécriture garde l'URL demandée et rend un 404 ordinaire.
    const res = await gateFlags(req(MUET.userRoutes[0]))
    expect(res).not.toBeNull()
    expect(res!.headers.get('location')).toBeNull()
    expect(res!.headers.get('x-middleware-rewrite')).toContain(CIBLE_MUETTE)
  })

  it('vise un chemin qu’aucune route n’occupe', () => {
    // La cible muette doit rester SANS page, pour que Next serve son not-found comme pour
    // une adresse inventée. Une page dédiée appelant `notFound()` a été essayée : elle
    // renvoie bien 404 mais avec un corps VIDE, donc visiblement différent d'un vrai 404 —
    // ce qui trahit le dispositif au lieu de le dissimuler. Si quelqu'un crée un jour une
    // route à cet emplacement, la fermeture muette redeviendrait reconnaissable.
    const dossier = resolve(__dirname, '..', '..', 'src', 'app', CIBLE_MUETTE.slice(1))
    expect(existsSync(dossier)).toBe(false)
  })

  it('compte le refus', async () => {
    await gateFlags(req(MUET.userRoutes[0]))
    expect(mockRecordBlock).toHaveBeenCalledWith(MUET.key)
  })

  it('ferme aussi un visiteur sans session', async () => {
    // La face `anonyme` est la plus exposée : les pages publiques ne passent pas par
    // l'authentification, donc rien d'autre ne les protège.
    mockGetSession.mockResolvedValue(null)
    const anonyme = FEATURE_FLAGS.find(
      (f) => f.closes.includes('anonyme') && f.userRoutes.length > 0,
    )!
    mockGetFlags.mockResolvedValue(masque(anonyme.key))
    await expect(gateFlags(req(anonyme.userRoutes[0]))).resolves.not.toBeNull()
  })
})

describe('fermeture explicite', () => {
  it('oriente les professionnels vers un message plutôt qu’un 404', async () => {
    mockGetFlags.mockResolvedValue(masque(EXPLICITE.key))
    mockGetSession.mockResolvedValue({ cjsUid: 'r1', roles: [EXPLICITE.closes[0], 'beneficiaire'] })
    const res = await gateFlags(req(EXPLICITE.userRoutes[0]))
    expect(res!.headers.get('x-middleware-rewrite')).toContain('/indisponible')
  })
})

describe('exemption de l’administration', () => {
  it('laisse un administrateur voir la vraie page', async () => {
    mockGetFlags.mockResolvedValue(masque(MUET.key))
    mockGetSession.mockResolvedValue({ cjsUid: 'a1', roles: ['admin', 'beneficiaire'] })
    await expect(gateFlags(req(MUET.userRoutes[0]))).resolves.toBeNull()
  })

  it('l’étend au modérateur', async () => {
    mockGetFlags.mockResolvedValue(masque(MUET.key))
    mockGetSession.mockResolvedValue({ cjsUid: 'm1', roles: ['moderator'] })
    await expect(gateFlags(req(MUET.userRoutes[0]))).resolves.toBeNull()
  })
})

describe('faces d’audience', () => {
  it('ne ferme pas un public absent de `closes`', async () => {
    // Le cœur du dispositif : le conseiller continue de préparer pendant que le module
    // est masqué aux jeunes. Fermer les deux viderait le catalogue le jour du lancement.
    const jeunesSeuls = FEATURE_FLAGS.find(
      (f) => f.userRoutes.length > 0 && !f.closes.includes('conseiller'),
    )!
    mockGetFlags.mockResolvedValue(masque(jeunesSeuls.key))
    mockGetSession.mockResolvedValue({ cjsUid: 'c1', roles: ['conseiller', 'beneficiaire'] })
    await expect(gateFlags(req(jeunesSeuls.userRoutes[0]))).resolves.toBeNull()
  })

  it('applique la face métier et non le rôle bénéficiaire hérité', async () => {
    // Un conseiller porte TOUJOURS `beneficiaire` en plus. Résoudre au premier rôle trouvé
    // lui appliquerait la face jeune et lui retirerait son comptoir.
    const jeunesSeuls = FEATURE_FLAGS.find(
      (f) => f.userRoutes.length > 0 && f.closes.includes('beneficiaire') && !f.closes.includes('conseiller'),
    )!
    mockGetFlags.mockResolvedValue(masque(jeunesSeuls.key))
    mockGetSession.mockResolvedValue({ cjsUid: 'c1', roles: ['beneficiaire', 'conseiller'] })
    await expect(gateFlags(req(jeunesSeuls.userRoutes[0]))).resolves.toBeNull()
  })
})

describe('fermeture progressive — le titulaire garde sa sortie', () => {
  const DRAIN = FEATURE_FLAGS.find((f) => f.closeMode === 'drain' && f.drainRoutes.length > 0)!

  it('laisse passer le titulaire d’un engagement sur la route de sortie', async () => {
    // Un jeune qui a un livre chez lui doit continuer de voir sa date de retour. Sans
    // cela, il passerait en retard sans le savoir, pour une décision d'administration.
    mockGetFlags.mockResolvedValue(masque(DRAIN.key))
    mockAUnEngagement.mockResolvedValue(true)
    await expect(gateFlags(req(DRAIN.drainRoutes[0]))).resolves.toBeNull()
  })

  it('ferme la même sortie à qui n’a aucun engagement', async () => {
    // La sortie est un droit personnel, pas une porte ouverte : elle ne doit pas devenir
    // le contournement du masquage pour tout le monde.
    mockGetFlags.mockResolvedValue(masque(DRAIN.key))
    mockAUnEngagement.mockResolvedValue(false)
    await expect(gateFlags(req(DRAIN.drainRoutes[0]))).resolves.not.toBeNull()
  })

  it('ferme l’ENTRÉE même au titulaire', async () => {
    // On ferme ce qui crée de nouveaux engagements. Le titulaire consulte, il ne réserve
    // plus — sinon la fermeture ne fermerait rien.
    const entree = DRAIN.userRoutes.find((r) => !DRAIN.drainRoutes.some((d) => d.startsWith(r)))
      ?? DRAIN.userRoutes[0]
    if (DRAIN.drainRoutes.includes(entree)) return
    mockGetFlags.mockResolvedValue(masque(DRAIN.key))
    mockAUnEngagement.mockResolvedValue(true)
    await expect(gateFlags(req(entree))).resolves.not.toBeNull()
  })

  it('ne consulte les engagements que sur une sortie', async () => {
    // Une requête par page sur toutes les routes masquées serait un coût permanent pour
    // un cas rare.
    mockGetFlags.mockResolvedValue(masque(MUET.key))
    await gateFlags(req(MUET.userRoutes[0]))
    expect(mockAUnEngagement).not.toHaveBeenCalled()
  })
})

describe('surfaces machine — jamais de 404', () => {
  it('laisse passer un webhook entrant', async () => {
    // Un 404 ferait retrier Meta et le SSO en boucle. Le refus se fait DANS la route,
    // par un 200 silencieux (lot 4).
    const whatsapp = FEATURE_FLAGS.find((f) => f.key === 'm11.whatsapp')!
    mockGetFlags.mockResolvedValue(masque(whatsapp.key))
    await expect(gateFlags(req('/api/whatsapp'))).resolves.toBeNull()
  })

  it('laisse passer une tâche planifiée', async () => {
    // Un 404 sur un cron serait compté comme un échec d'exécution et déclencherait des
    // alertes pour une fermeture volontaire.
    mockGetFlags.mockResolvedValue(masque(MUET.key))
    await expect(gateFlags(req('/api/cron/cleanup-checkins'))).resolves.toBeNull()
  })
})

describe('dégradation', () => {
  it('laisse passer si l’état des fonctionnalités est illisible', async () => {
    // `getFlags` ne rejette jamais en théorie ; si l'impossible arrive, une panne
    // interne ne doit pas rendre la plateforme inaccessible.
    mockGetFlags.mockRejectedValue(new Error('panne'))
    await expect(gateFlags(req(MUET.userRoutes[0]))).resolves.toBeNull()
  })
})
