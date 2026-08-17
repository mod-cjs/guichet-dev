/**
 * @jest-environment node
 *
 * GUIC-706 (Phase 2b) — backfill `MembreOrganisation` contre MariaDB réelle.
 * Règle : org avec `cjsUid` pointant un utilisateur EXISTANT → membre `titulaire` (actif) ;
 * org sans compte (`cjsUid` null) ou orpheline (`cjsUid` sans utilisateur) → 0 membre.
 * Idempotent : rejouable sans doublon (garde `@@unique([organisationId, cjsUid])`).
 */
import { prisma } from '@/lib/prisma'
import { backfillMembresTitulaires } from '@/lib/decouplage/backfill-membres'

jest.setTimeout(30000)

const PREFIX = 'test-backfill-706'

async function purge() {
  await prisma.membreOrganisation.deleteMany({ where: { organisation: { nom: { startsWith: PREFIX } } } })
  await prisma.organisation.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  await prisma.utilisateur.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}

let orgAvecCompte = ''
let orgSansCompte = ''
let orgOrpheline = ''
let orgAnonyme = ''
const uid = `${PREFIX}-uid-titulaire`
const uidAnon = `${PREFIX}-uid-anonyme`

beforeAll(async () => {
  await purge()
  await prisma.utilisateur.create({ data: { cjsUid: uid, nom: `${PREFIX} Titulaire`, prenom: 'Awa' } })
  await prisma.utilisateur.create({ data: { cjsUid: uidAnon, nom: `${PREFIX} Anonyme`, prenom: '—', statut: 'anonymise' } })
  const a = await prisma.organisation.create({ data: { nom: `${PREFIX} Avec Compte`, cjsUid: uid, statut: 'active' }, select: { id: true } })
  const s = await prisma.organisation.create({ data: { nom: `${PREFIX} Sans Compte`, cjsUid: null, statut: 'active' }, select: { id: true } })
  const o = await prisma.organisation.create({ data: { nom: `${PREFIX} Orpheline`, cjsUid: `${PREFIX}-uid-fantome`, statut: 'active' }, select: { id: true } })
  const an = await prisma.organisation.create({ data: { nom: `${PREFIX} Anonyme`, cjsUid: uidAnon, statut: 'active' }, select: { id: true } })
  orgAvecCompte = a.id; orgSansCompte = s.id; orgOrpheline = o.id; orgAnonyme = an.id
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

describe('GUIC-706 — backfillMembresTitulaires (DB réelle)', () => {
  it('org avec cjsUid valide → crée un membre titulaire actif', async () => {
    const res = await backfillMembresTitulaires()
    expect(res.crees).toBeGreaterThanOrEqual(1)
    const membres = await prisma.membreOrganisation.findMany({ where: { organisationId: orgAvecCompte } })
    expect(membres).toHaveLength(1)
    expect(membres[0]).toMatchObject({ cjsUid: uid, role: 'titulaire', statut: 'actif' })
  })

  it('org sans compte (cjsUid null) → 0 membre', async () => {
    const n = await prisma.membreOrganisation.count({ where: { organisationId: orgSansCompte } })
    expect(n).toBe(0)
  })

  it('org orpheline (cjsUid sans utilisateur) → 0 membre', async () => {
    const n = await prisma.membreOrganisation.count({ where: { organisationId: orgOrpheline } })
    expect(n).toBe(0)
  })

  it('org dont le cjsUid pointe un compte ANONYMISÉ → 0 membre (personne déliée, matrice §4)', async () => {
    const n = await prisma.membreOrganisation.count({ where: { organisationId: orgAnonyme } })
    expect(n).toBe(0)
  })

  it('idempotent : rejouer ne crée pas de doublon', async () => {
    const res2 = await backfillMembresTitulaires()
    // aucune nouvelle création pour mes orgs (le membre existe déjà)
    const membres = await prisma.membreOrganisation.findMany({ where: { organisationId: orgAvecCompte } })
    expect(membres).toHaveLength(1)
    expect(res2.dejaPresents).toBeGreaterThanOrEqual(1)
  })
})
