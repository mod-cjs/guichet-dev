/**
 * @jest-environment node
 *
 * GUIC-28 — Server actions CRUD opportunités admin.
 * INTÉGRATION RÉELLE : prisma + OpportuniteService NON mockés → écrit dans la vraie
 * MariaDB (docker gj-maria, port 3307). Auth + next/cache = bords mockés.
 * Pré-requis : DATABASE_URL + types d'opportunité seedés (les 10 sous-types).
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import {
  creerOpportunite,
  modifierOpportunite,
  supprimerOpportunite,
} from '@/app/admin/opportunites/actions'

const ADMIN = {
  cjsUid: 'test-admin-crud', nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, roles: ['admin'], accessToken: 'x', refreshToken: 'y', expiresAt: 0, onboardingComplete: true,
}

let createdId: string | null = null
const slug = `test-crud-${Date.now()}-${Math.floor(performance.now())}`

afterEach(async () => {
  if (createdId) {
    await prisma.opportunite.delete({ where: { id: createdId } }).catch(() => {})
    createdId = null
  }
})
afterAll(async () => { await prisma.$disconnect() })

describe('GUIC-28 — CRUD opportunité (DB réelle)', () => {
  it('creer → modifier → supprimer (soft) une bourse de bout en bout', async () => {
    mockGetSession.mockResolvedValue(ADMIN)

    // CREATE (brouillon)
    const { id } = await creerOpportunite({
      type: 'bourse',
      base: {
        titre: 'Bourse CRUD test',
        slug,
        description: 'Fixture intégration GUIC-28.',
        organisationLibelle: 'CJS',
        domaine: 'Economie',
        statut: 'brouillon',
        // GUIC-684 — rattachement obligatoire à au moins un programme.
        programmeSlugs: ['yaakaar'],
      },
      details: { montantTotalFcfa: 750000, organismeFinanceur: 'CJS' },
    })
    createdId = id

    const created = await prisma.opportunite.findUnique({
      where: { id },
      select: { statut: true, titre: true, bourse: { select: { montantTotalFcfa: true } } },
    })
    expect(created?.statut).toBe('brouillon')
    expect(created?.bourse?.montantTotalFcfa).toBe(750000)

    // UPDATE
    await modifierOpportunite(id, { base: { titre: 'Bourse CRUD test (éditée)' } })
    const updated = await prisma.opportunite.findUnique({ where: { id }, select: { titre: true } })
    expect(updated?.titre).toBe('Bourse CRUD test (éditée)')

    // SOFT DELETE
    await supprimerOpportunite(id)
    const deleted = await prisma.opportunite.findUnique({ where: { id }, select: { deletedAt: true } })
    expect(deleted?.deletedAt).toBeInstanceOf(Date)
  })

  it('refuse un slug déjà pris (SLUG_EXISTANT)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const dupSlug = `${slug}-dup`
    const { id } = await creerOpportunite({
      type: 'bourse',
      base: { titre: 'Dup', slug: dupSlug, description: 'x', organisationLibelle: 'CJS', domaine: 'Autre', programmeSlugs: ['yeah'] },
      details: { montantTotalFcfa: 1, organismeFinanceur: 'CJS' },
    })
    createdId = id
    await expect(
      creerOpportunite({
        type: 'bourse',
        base: { titre: 'Dup 2', slug: dupSlug, description: 'y', organisationLibelle: 'CJS', domaine: 'Autre' },
        details: { montantTotalFcfa: 2, organismeFinanceur: 'CJS' },
      }),
    ).rejects.toThrow(/SLUG_EXISTANT/)
  })
})
