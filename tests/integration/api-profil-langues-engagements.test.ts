/**
 * @jest-environment node
 *
 * GUIC-689 — Langues et engagements : INTÉGRATION RÉELLE.
 *
 * Prisma n'est PAS mocké : ces routes portent deux garanties qu'un mock ne peut
 * pas éprouver, parce qu'il rendrait simplement ce qu'on lui dicte —
 *
 *   1. **l'unicité `(profil, langue)`**, tenue par une contrainte de base : le
 *      test doit voir la contrainte se déclencher, pas une promesse de code ;
 *   2. **l'impossibilité de supprimer la ligne d'autrui** : un `deleteMany`
 *      filtré sur l'id seul passerait tous les tests mockés du monde tout en
 *      laissant n'importe qui effacer les données du voisin.
 *
 * Bords non-DB mockés : session et rate-limit.
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn().mockResolvedValue(null) }))

import { NextRequest } from 'next/server'
import { POST as postLangue } from '@/app/api/profil/langues/route'
import { DELETE as deleteLangue } from '@/app/api/profil/langues/[id]/route'
import { POST as postEngagement } from '@/app/api/profil/engagements/route'
import { DELETE as deleteEngagement } from '@/app/api/profil/engagements/[id]/route'

const MOI = `test-langues-moi-${Date.now()}`
const AUTRUI = `test-langues-autrui-${Date.now()}`

function req(url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: body ? 'POST' : 'DELETE',
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
}

async function creerCompte(cjsUid: string) {
  await prisma.utilisateur.create({
    data: { cjsUid, nom: 'Test', prenom: 'Langue' },
  })
  await prisma.profilJeune.create({ data: { cjsUid } })
}

beforeAll(async () => {
  await creerCompte(MOI)
  await creerCompte(AUTRUI)
})

afterAll(async () => {
  for (const uid of [MOI, AUTRUI]) {
    await prisma.langueProfil.deleteMany({ where: { profil: { cjsUid: uid } } })
    await prisma.engagement.deleteMany({ where: { profil: { cjsUid: uid } } })
    await prisma.profilJeune.deleteMany({ where: { cjsUid: uid } })
    await prisma.utilisateur.deleteMany({ where: { cjsUid: uid } })
  }
  await prisma.$disconnect()
})

describe('GUIC-689 — langues (DB réelle)', () => {
  it('crée la langue et la retrouve en base', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: MOI })
    const res = await postLangue(req('/api/profil/langues', { langue: 'Wolof', niveau: 'maternelle' }))
    expect(res.status).toBe(201)

    const enBase = await prisma.langueProfil.findFirst({ where: { profil: { cjsUid: MOI }, langue: 'Wolof' } })
    expect(enBase?.niveau).toBe('maternelle')
  })

  it('refuse la même langue deux fois — la contrainte de base se déclenche', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: MOI })
    const res = await postLangue(req('/api/profil/langues', { langue: 'Wolof', niveau: 'courant' }))
    expect(res.status).toBe(409)

    // Et surtout : la première déclaration n'a pas été écrasée.
    const lignes = await prisma.langueProfil.findMany({ where: { profil: { cjsUid: MOI }, langue: 'Wolof' } })
    expect(lignes).toHaveLength(1)
    expect(lignes[0].niveau).toBe('maternelle')
  })

  it('NE PEUT PAS supprimer la langue d’un autre compte', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: AUTRUI })
    await postLangue(req('/api/profil/langues', { langue: 'Pulaar', niveau: 'courant' }))
    const cible = await prisma.langueProfil.findFirstOrThrow({ where: { profil: { cjsUid: AUTRUI } } })

    // On repasse sur MON compte et on vise l'identifiant du voisin.
    mockGetSession.mockResolvedValue({ cjsUid: MOI })
    const res = await deleteLangue(req(`/api/profil/langues/${cible.id}`), {
      params: Promise.resolve({ id: cible.id }),
    })
    expect(res.status).toBe(404)

    const toujoursLa = await prisma.langueProfil.findUnique({ where: { id: cible.id } })
    expect(toujoursLa).not.toBeNull()
  })

  it('supprime bien sa propre langue', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: MOI })
    const mienne = await prisma.langueProfil.findFirstOrThrow({ where: { profil: { cjsUid: MOI } } })
    const res = await deleteLangue(req(`/api/profil/langues/${mienne.id}`), {
      params: Promise.resolve({ id: mienne.id }),
    })
    expect(res.status).toBe(200)
    expect(await prisma.langueProfil.findUnique({ where: { id: mienne.id } })).toBeNull()
  })
})

describe('GUIC-689 — engagements (DB réelle)', () => {
  it('crée l’engagement et le retrouve en base', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: MOI })
    const res = await postEngagement(
      req('/api/profil/engagements', {
        role: 'Bénévole sensibilisation',
        organisation: 'Jeunesse & Environnement',
        dateDebut: '2022-03-01',
        dateFin: '2023-12-31',
      }),
    )
    expect(res.status).toBe(201)
    const enBase = await prisma.engagement.findFirst({ where: { profil: { cjsUid: MOI } } })
    expect(enBase?.organisation).toBe('Jeunesse & Environnement')
  })

  it('refuse une date de fin antérieure au début', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: MOI })
    const res = await postEngagement(
      req('/api/profil/engagements', {
        role: 'Test',
        organisation: 'Test',
        dateDebut: '2023-01-01',
        dateFin: '2022-01-01',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('NE PEUT PAS supprimer l’engagement d’un autre compte', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: AUTRUI })
    await postEngagement(
      req('/api/profil/engagements', {
        role: 'Bénévole', organisation: 'Asso voisine', dateDebut: '2021-01-01', dateFin: null,
      }),
    )
    const cible = await prisma.engagement.findFirstOrThrow({ where: { profil: { cjsUid: AUTRUI } } })

    mockGetSession.mockResolvedValue({ cjsUid: MOI })
    const res = await deleteEngagement(req(`/api/profil/engagements/${cible.id}`), {
      params: Promise.resolve({ id: cible.id }),
    })
    expect(res.status).toBe(404)
    expect(await prisma.engagement.findUnique({ where: { id: cible.id } })).not.toBeNull()
  })
})
