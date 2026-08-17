/**
 * @jest-environment node
 *
 * GUIC-706 (Phase 2b, Q5) — fusion de deux organisations (DB réelle, auth mockée admin).
 * « GIZ » curé (source) fusionné dans « GIZ Sénégal » recruteur (cible canonique) :
 * réaffecte les offres + déplace les membres (sans doublon), propage la vérification,
 * supprime la source. Garde-fous : source ≠ cible, existence, FORBIDDEN.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fusionnerOrganisations } from '@/app/admin/partenaires/actions'

jest.setTimeout(30000)

const PREFIX = 'test-fusion-706'
const mockSession = getSession as jest.Mock

async function purge() {
  await prisma.opportunite.deleteMany({ where: { titre: { startsWith: PREFIX } } })
  await prisma.membreOrganisation.deleteMany({ where: { organisation: { nom: { startsWith: PREFIX } } } })
  await prisma.organisation.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  await prisma.utilisateur.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}

beforeEach(async () => {
  await purge()
  mockSession.mockResolvedValue({ cjsUid: 'admin-fusion', roles: ['admin'] })
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

async function orgs() {
  const source = await prisma.organisation.create({ data: { nom: `${PREFIX} GIZ`, cjsUid: null, statut: 'active', estVerifie: true }, select: { id: true } })
  const cible = await prisma.organisation.create({ data: { nom: `${PREFIX} GIZ Sénégal`, cjsUid: null, statut: 'active', estVerifie: false }, select: { id: true } })
  return { source: source.id, cible: cible.id }
}

describe('GUIC-706 Q5 — fusionnerOrganisations (DB réelle)', () => {
  it('réaffecte les offres, déplace les membres, propage la vérification, supprime la source', async () => {
    const { source, cible } = await orgs()
    await prisma.utilisateur.create({ data: { cjsUid: `${PREFIX}-u1`, nom: `${PREFIX} U1`, prenom: 'A' } })
    await prisma.membreOrganisation.create({ data: { organisationId: source, cjsUid: `${PREFIX}-u1`, role: 'titulaire', statut: 'actif' } })
    await prisma.opportunite.create({ data: { slug: `${PREFIX}-o1`, titre: `${PREFIX} Offre1`, description: 'x', type: 'Emploi', domaine: 'Autre', organisation: 'GIZ', organisationId: source, statut: 'publiee' } })

    const res = await fusionnerOrganisations({ sourceId: source, cibleId: cible })
    expect(res.offresReaffectees).toBe(1)

    expect(await prisma.organisation.findUnique({ where: { id: source } })).toBeNull() // source supprimée
    expect(await prisma.opportunite.count({ where: { organisationId: cible, titre: { startsWith: PREFIX } } })).toBe(1)
    expect(await prisma.membreOrganisation.count({ where: { organisationId: cible } })).toBe(1)
    const cibleApres = await prisma.organisation.findUnique({ where: { id: cible }, select: { estVerifie: true } })
    expect(cibleApres?.estVerifie).toBe(true) // vérification propagée depuis la source
  })

  it('membre présent dans les deux orgs → pas de doublon (unique respecté)', async () => {
    const { source, cible } = await orgs()
    await prisma.utilisateur.create({ data: { cjsUid: `${PREFIX}-u2`, nom: `${PREFIX} U2`, prenom: 'B' } })
    await prisma.membreOrganisation.create({ data: { organisationId: source, cjsUid: `${PREFIX}-u2`, role: 'recruteur', statut: 'actif' } })
    await prisma.membreOrganisation.create({ data: { organisationId: cible, cjsUid: `${PREFIX}-u2`, role: 'titulaire', statut: 'actif' } })

    await fusionnerOrganisations({ sourceId: source, cibleId: cible })
    expect(await prisma.membreOrganisation.count({ where: { organisationId: cible, cjsUid: `${PREFIX}-u2` } })).toBe(1)
  })

  it('source == cible → erreur, rien supprimé', async () => {
    const { cible } = await orgs()
    await expect(fusionnerOrganisations({ sourceId: cible, cibleId: cible })).rejects.toThrow(/MEME_ORGANISATION/)
    expect(await prisma.organisation.findUnique({ where: { id: cible } })).not.toBeNull()
  })

  it('non-admin → FORBIDDEN', async () => {
    const { source, cible } = await orgs()
    mockSession.mockResolvedValueOnce({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(fusionnerOrganisations({ sourceId: source, cibleId: cible })).rejects.toThrow(/FORBIDDEN/)
    expect(await prisma.organisation.findUnique({ where: { id: source } })).not.toBeNull()
  })
})
