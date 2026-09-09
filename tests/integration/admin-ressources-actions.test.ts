/**
 * @jest-environment node
 *
 * GUIC-463 — Server actions CRUD Ressources (admin). INTÉGRATION RÉELLE :
 * prisma N'EST PAS mocké → vraie MariaDB (quality-charter §3). Auth/cache mockés.
 * Pré-requis : DATABASE_URL vers la base de test locale (docker gj-maria 3307).
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
const mockRevalidate = jest.fn()
jest.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => mockRevalidate(...a) }))

import {
  creerRessource,
  modifierRessource,
  supprimerRessource,
} from '@/app/admin/ressources/actions'

const base = {
  cjsUid: 'test-admin', nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
}
const ADMIN = { ...base, roles: ['admin'] }
const JEUNE = { ...base, roles: ['beneficiaire'] }

const valid = {
  titre: 'Guide test CRUD',
  description: 'Fixture intégration GUIC-463.',
  type: 'PDF' as const,
  theme: 'Emploi',
  url: 'https://example.org/guide.pdf',
  categorie: 'Démarches',
  estPublic: true,
  // GUIC-684 — rattachement obligatoire à au moins un programme.
  programmeSlugs: ['yeah'],
}

const created: string[] = []
afterEach(async () => {
  if (created.length) {
    // Purge des favoris AVANT les ressources (FK Restrict).
    await prisma.ressourceFavorite.deleteMany({ where: { ressourceId: { in: created } } })
    await prisma.ressource.deleteMany({ where: { id: { in: created } } })
    created.length = 0
  }
})
afterAll(async () => { await prisma.$disconnect() })

describe('GUIC-463 — CRUD ressources (DB réelle)', () => {
  it('given admin + données valides, when creer, then la ressource existe en base', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const r = await creerRessource(valid)
    created.push(r.id)
    const row = await prisma.ressource.findUnique({ where: { id: r.id } })
    expect(row?.titre).toBe('Guide test CRUD')
    expect(row?.type).toBe('PDF')
    expect(row?.estPublic).toBe(true)
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/ressources')
  })

  it('given une ressource, when modifier, then les champs changent en base', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const r = await creerRessource(valid); created.push(r.id)
    await modifierRessource(r.id, { ...valid, titre: 'Titre modifié', estPublic: false })
    const row = await prisma.ressource.findUnique({ where: { id: r.id } })
    expect(row?.titre).toBe('Titre modifié')
    expect(row?.estPublic).toBe(false)
  })

  it('given une ressource, when supprimer, then la row disparaît', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const r = await creerRessource(valid)
    await supprimerRessource(r.id)
    const row = await prisma.ressource.findUnique({ where: { id: r.id } })
    expect(row).toBeNull()
  })

  // GUIC-689 — ces deux tests comptaient TOUTE la table. Trois autres suites
  // écrivent dans `Ressource` ; en parallèle, une création concurrente entre le
  // `before` et l'assertion faisait échouer un refus pourtant correct. Le test
  // devenait rouge par hasard, exactement comme un test peut être vert par
  // hasard. On compte donc ce que l'action aurait créé, et rien d'autre.
  const compterFixture = (titre: string) => prisma.ressource.count({ where: { titre } })

  it('given NON-admin, when creer, then refus ET rien créé', async () => {
    mockGetSession.mockResolvedValue(JEUNE)
    const before = await compterFixture(valid.titre)
    await expect(creerRessource(valid)).rejects.toThrow(/FORBIDDEN/)
    expect(await compterFixture(valid.titre)).toBe(before)
  })

  it('given admin + titre vide, when creer, then rejet Zod (rien créé)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    // Un titre vide ne peut pas servir de clé de comptage : on vérifie qu'aucune
    // ressource sans titre n'a été écrite.
    const before = await compterFixture('')
    await expect(creerRessource({ ...valid, titre: '' })).rejects.toThrow()
    expect(await compterFixture('')).toBe(before)
  })

  // RES-3 — la FK RessourceFavorite est Restrict : supprimer une ressource déjà
  // mise en favori échouait (P2003). La transaction purge les favoris d'abord.
  it('given une ressource MISE EN FAVORI, when supprimer, then réussit (cascade favoris)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const r = await creerRessource(valid); created.push(r.id)
    const u = await prisma.utilisateur.findFirst({ select: { cjsUid: true } })
    if (!u) { console.warn('Aucun utilisateur en base — RES-3 non exécuté'); return }
    await prisma.ressourceFavorite.create({ data: { cjsUid: u.cjsUid, ressourceId: r.id } })

    await supprimerRessource(r.id) // ne doit PAS throw (avant : P2003 FK Restrict)

    expect(await prisma.ressource.findUnique({ where: { id: r.id } })).toBeNull()
    expect(
      await prisma.ressourceFavorite.findUnique({
        where: { cjsUid_ressourceId: { cjsUid: u.cjsUid, ressourceId: r.id } },
      }),
    ).toBeNull()
  })

  it('given NON-admin, when supprimer, then refus ET row conservée', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const r = await creerRessource(valid); created.push(r.id)
    mockGetSession.mockResolvedValue(JEUNE)
    await expect(supprimerRessource(r.id)).rejects.toThrow(/FORBIDDEN/)
    expect(await prisma.ressource.findUnique({ where: { id: r.id } })).not.toBeNull()
  })
})
