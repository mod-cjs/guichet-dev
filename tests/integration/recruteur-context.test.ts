/**
 * @jest-environment node
 *
 * GUIC-706 (Phase 2b) — `getRecruteurContext` dérive l'org de la MEMBERSHIP active
 * (MembreOrganisation, 0..N) et non plus du legacy `Organisation.cjsUid` 1:1.
 * Active le multi-recruteur : un 2e membre obtient bien son org. Fallback legacy conservé
 * (org non encore backfillée). DB réelle.
 */
import { prisma } from '@/lib/prisma'
import { getRecruteurContext } from '@/lib/loaders/recruteur'

jest.setTimeout(30000)

const PREFIX = 'test-recctx-706'

async function purge() {
  await prisma.membreOrganisation.deleteMany({ where: { organisation: { nom: { startsWith: PREFIX } } } })
  await prisma.organisation.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  await prisma.utilisateur.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}

beforeAll(purge)
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

describe('GUIC-706 — getRecruteurContext (membership-aware, DB réelle)', () => {
  it('membre actif → org de la membership (pas besoin de cjsUid legacy)', async () => {
    const uid = `${PREFIX}-membre`
    await prisma.utilisateur.create({ data: { cjsUid: uid, nom: `${PREFIX} Membre`, prenom: 'Awa' } })
    const org = await prisma.organisation.create({ data: { nom: `${PREFIX} OrgM`, cjsUid: null, statut: 'active' }, select: { id: true } })
    await prisma.membreOrganisation.create({ data: { organisationId: org.id, cjsUid: uid, role: 'recruteur', statut: 'actif' } })

    const ctx = await getRecruteurContext(uid)
    expect(ctx.organisationId).toBe(org.id)
    expect(ctx.organisationNom).toBe(`${PREFIX} OrgM`)
  })

  it('titulaire de A + recruteur de B → préfère l’org où il est titulaire', async () => {
    const uid = `${PREFIX}-multi`
    await prisma.utilisateur.create({ data: { cjsUid: uid, nom: `${PREFIX} Multi`, prenom: 'Bou' } })
    const a = await prisma.organisation.create({ data: { nom: `${PREFIX} OrgA`, cjsUid: null, statut: 'active' }, select: { id: true } })
    const b = await prisma.organisation.create({ data: { nom: `${PREFIX} OrgB`, cjsUid: null, statut: 'active' }, select: { id: true } })
    await prisma.membreOrganisation.create({ data: { organisationId: b.id, cjsUid: uid, role: 'recruteur', statut: 'actif' } })
    await prisma.membreOrganisation.create({ data: { organisationId: a.id, cjsUid: uid, role: 'titulaire', statut: 'actif' } })

    const ctx = await getRecruteurContext(uid)
    expect(ctx.organisationId).toBe(a.id)
  })

  it('membership révoquée seule (pas de legacy) → aucune org', async () => {
    const uid = `${PREFIX}-revoke`
    await prisma.utilisateur.create({ data: { cjsUid: uid, nom: `${PREFIX} Revoke`, prenom: 'Cam' } })
    const org = await prisma.organisation.create({ data: { nom: `${PREFIX} OrgR`, cjsUid: null, statut: 'active' }, select: { id: true } })
    await prisma.membreOrganisation.create({ data: { organisationId: org.id, cjsUid: uid, role: 'recruteur', statut: 'revoke' } })

    const ctx = await getRecruteurContext(uid)
    expect(ctx.organisationId).toBeNull()
  })

  it('fallback legacy : pas de membership mais Organisation.cjsUid = lui → cette org', async () => {
    const uid = `${PREFIX}-legacy`
    await prisma.utilisateur.create({ data: { cjsUid: uid, nom: `${PREFIX} Legacy`, prenom: 'Dia' } })
    const org = await prisma.organisation.create({ data: { nom: `${PREFIX} OrgL`, cjsUid: uid, statut: 'active' }, select: { id: true } })

    const ctx = await getRecruteurContext(uid)
    expect(ctx.organisationId).toBe(org.id)
  })
})
