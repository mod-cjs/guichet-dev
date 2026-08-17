/**
 * @jest-environment node
 *
 * GUIC-706 (Phase 2b) — actions de gestion des membres d'un partenaire, DB réelle
 * (seule l'auth simulée admin). rattacherMembre (0..N) + changerStatutMembre (revoke/actif).
 * Frontière : le RÔLE recruteur reste attribué côté SSO ; ici on gère le rattachement local.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rattacherMembre, changerStatutMembre } from '@/app/admin/partenaires/actions'

jest.setTimeout(30000)

const PREFIX = 'test-membres-706'
const mockSession = getSession as jest.Mock
const uidA = `${PREFIX}-uid-a`
const uidB = `${PREFIX}-uid-b`
let orgId = ''

async function purge() {
  await prisma.membreOrganisation.deleteMany({ where: { organisation: { nom: { startsWith: PREFIX } } } })
  await prisma.organisation.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  await prisma.utilisateur.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}

beforeAll(async () => {
  await purge()
  mockSession.mockResolvedValue({ cjsUid: 'admin-membres', roles: ['admin'] })
  await prisma.utilisateur.create({ data: { cjsUid: uidA, nom: `${PREFIX} A`, prenom: 'Awa' } })
  await prisma.utilisateur.create({ data: { cjsUid: uidB, nom: `${PREFIX} B`, prenom: 'Bou' } })
  const o = await prisma.organisation.create({ data: { nom: `${PREFIX} Org`, cjsUid: null, statut: 'active' }, select: { id: true } })
  orgId = o.id
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

describe('GUIC-706 — rattacherMembre / changerStatutMembre (DB réelle)', () => {
  it('rattache un membre recruteur actif (multi-membres 0..N)', async () => {
    const r = await rattacherMembre({ organisationId: orgId, cjsUid: uidA })
    const m = await prisma.membreOrganisation.findUnique({ where: { id: r.id } })
    expect(m).toMatchObject({ organisationId: orgId, cjsUid: uidA, role: 'recruteur', statut: 'actif' })
    // 2e membre sur la même org → 0..N
    await rattacherMembre({ organisationId: orgId, cjsUid: uidB, role: 'titulaire' })
    expect(await prisma.membreOrganisation.count({ where: { organisationId: orgId } })).toBe(2)
  })

  it('rattacher un utilisateur inconnu → refus (UTILISATEUR_INCONNU)', async () => {
    await expect(rattacherMembre({ organisationId: orgId, cjsUid: `${PREFIX}-fantome` })).rejects.toThrow(/UTILISATEUR_INCONNU/)
  })

  it('rattacher deux fois le même → refus (DEJA_MEMBRE), pas de doublon', async () => {
    await expect(rattacherMembre({ organisationId: orgId, cjsUid: uidA })).rejects.toThrow(/DEJA_MEMBRE/)
    expect(await prisma.membreOrganisation.count({ where: { organisationId: orgId, cjsUid: uidA } })).toBe(1)
  })

  it('révoquer puis réactiver un membre (statut)', async () => {
    const m = await prisma.membreOrganisation.findFirst({ where: { organisationId: orgId, cjsUid: uidA }, select: { id: true } })
    await changerStatutMembre(m!.id, 'revoke')
    expect((await prisma.membreOrganisation.findUnique({ where: { id: m!.id } }))?.statut).toBe('revoke')
    await changerStatutMembre(m!.id, 'actif')
    expect((await prisma.membreOrganisation.findUnique({ where: { id: m!.id } }))?.statut).toBe('actif')
  })

  it('non-admin → FORBIDDEN (frontière auth)', async () => {
    mockSession.mockResolvedValueOnce({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(rattacherMembre({ organisationId: orgId, cjsUid: uidB })).rejects.toThrow(/FORBIDDEN/)
  })
})
