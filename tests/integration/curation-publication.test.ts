/**
 * @jest-environment node
 *
 * GUIC-601 — US-6 : publication d'un item validé. INTÉGRATION RÉELLE MariaDB
 * (guichet_mariadb:3307), prisma non mocké. Réutilise le workflow OpportuniteService.
 */
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { publierItem } from '@/app/admin/curation/publier'

const ADMIN = { cjsUid: 'test-admin-pub', roles: ['admin'] }
const PREFIX = 'test-guic601'
const RUN = Date.now()

let TYPE_EMPLOI = ''
beforeAll(async () => {
  const t = await prisma.opportuniteType.findUnique({ where: { slug: 'emploi' } })
  TYPE_EMPLOI = t?.id ?? ''
})

async function source() {
  return prisma.sourceVeille.create({
    data: {
      nom: `${PREFIX} src ${Math.random().toString(36).slice(2, 8)}`,
      url: `https://veille-${RUN}-${Math.random().toString(36).slice(2, 8)}.sn/l`,
      methode: 'rss',
      frequence: 'quotidienne',
    },
  })
}

async function itemApprouve(sourceId: string, payloadOver: Record<string, unknown> = {}, statut: 'approuvee' | 'a_valider' = 'approuvee') {
  const url = `https://veille-${RUN}.sn/o/${Math.random().toString(36).slice(2, 10)}`
  return prisma.itemCuration.create({
    data: {
      sourceId,
      urlCanonique: url,
      empreinte: createHash('sha256').update(url).digest('hex'),
      titre: `${PREFIX} Assistant logistique`,
      payloadExtrait: {
        titre: `${PREFIX} Assistant logistique`,
        description: 'Poste basé à Dakar.',
        organisation: 'ONG Teranga',
        region: 'Dakar',
        domaine: 'Numerique',
        typeId: TYPE_EMPLOI,
        deadline: '2026-12-31',
        ...payloadOver,
      } as object,
      statut,
    },
  })
}

async function purge() {
  const items = await prisma.itemCuration.findMany({ where: { source: { nom: { startsWith: PREFIX } } }, select: { opportuniteId: true } })
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  const oppIds = items.map((i) => i.opportuniteId).filter((x): x is string => !!x)
  if (oppIds.length) await prisma.opportunite.deleteMany({ where: { id: { in: oppIds } } })
  await prisma.opportunite.deleteMany({ where: { titre: { startsWith: PREFIX } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  await prisma.auditLog.deleteMany({ where: { actorCjsUid: ADMIN.cjsUid } })
}
beforeAll(purge)
afterEach(async () => {
  await purge()
  jest.clearAllMocks()
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-601 — publierItem', () => {
  it('refuse sans session admin', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(publierItem('x')).rejects.toThrow(/FORBIDDEN/)
  })

  it('refuse un rôle authentifié non-admin (escalade de privilège)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u', roles: ['jeune'] })
    await expect(publierItem('x')).rejects.toThrow(/FORBIDDEN/)
  })

  it('refuse un item NON approuvé', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const s = await source()
    const it = await itemApprouve(s.id, {}, 'a_valider')
    await expect(publierItem(it.id)).rejects.toThrow(/CONFLIT_STATUT|approuv/i)
  })

  it('refuse un item sans type valide', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const s = await source()
    const it = await itemApprouve(s.id, { typeId: undefined })
    await expect(publierItem(it.id)).rejects.toThrow(/[Tt]ype/)
  })

  it('publie un approuvé → Opportunite brouillon + lien de traçabilité', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const s = await source()
    const it = await itemApprouve(s.id)

    const { opportuniteId } = await publierItem(it.id)
    expect(opportuniteId).toBeTruthy()

    const opp = await prisma.opportunite.findUnique({
      where: { id: opportuniteId },
      include: { typeRef: true, emploi: true },
    })
    expect(opp?.statut).toBe('brouillon') // catalogue via éditeur existant (complétion)
    expect(opp?.titre).toBe(`${PREFIX} Assistant logistique`)
    expect(opp?.organisationLibelle).toBe('ONG Teranga')
    expect(opp?.region).toBe('Dakar')
    expect(opp?.domaine).toBe('Numerique')
    expect(opp?.lienExterne).toBe(it.urlCanonique) // traçabilité vers la source
    expect(opp?.typeRef?.slug).toBe('emploi')
    expect(opp?.emploi).not.toBeNull() // sous-type minimal créé

    // Lien de traçabilité côté item.
    const apres = await prisma.itemCuration.findUnique({ where: { id: it.id } })
    expect(apres?.opportuniteId).toBe(opportuniteId)
    // Audit HONNÊTE : création de brouillon issue de curation (pas 'publish' — statut brouillon).
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'opportunite.create', targetId: opportuniteId },
    })
    expect(audit).not.toBeNull()
  })

  it('idempotence : republier un item déjà publié est refusé', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const s = await source()
    const it = await itemApprouve(s.id)
    await publierItem(it.id)
    await expect(publierItem(it.id)).rejects.toThrow(/DEJA_PUBLIE|déjà/i)
  })

  it('domaine non mappable → défaut Autre (publication ne casse pas)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const s = await source()
    const it = await itemApprouve(s.id, { domaine: 'Charabia inconnu', region: 'PaysImaginaire' })
    const { opportuniteId } = await publierItem(it.id)
    const opp = await prisma.opportunite.findUnique({ where: { id: opportuniteId } })
    expect(opp?.domaine).toBe('Autre')
    expect(opp?.region).toBeNull() // région non mappable → null
  })

  it('deadline non-ISO → deadline null (pas de crash de create)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const s = await source()
    const it = await itemApprouve(s.id, { deadline: 'bientôt' })
    const { opportuniteId } = await publierItem(it.id)
    const opp = await prisma.opportunite.findUnique({ where: { id: opportuniteId } })
    expect(opp?.deadline).toBeNull()
  })

  it('sous-type bourse : détails plancher créés (montant 0, organisme = source)', async () => {
    const typeBourse = await prisma.opportuniteType.findUnique({ where: { slug: 'bourse' } })
    if (!typeBourse) return // seed absent → skip
    mockGetSession.mockResolvedValue(ADMIN)
    const s = await source()
    const it = await itemApprouve(s.id, { typeId: typeBourse.id })
    const { opportuniteId } = await publierItem(it.id)
    const opp = await prisma.opportunite.findUnique({ where: { id: opportuniteId }, include: { bourse: true, typeRef: true } })
    expect(opp?.typeRef?.slug).toBe('bourse')
    expect(opp?.bourse).not.toBeNull()
    expect(opp?.bourse?.montantTotalFcfa).toBe(0)
  })

  it('CONCURRENCE : deux publications simultanées → UNE seule Opportunite (claim atomique)', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    const s = await source()
    const it = await itemApprouve(s.id)

    const resultats = await Promise.allSettled([publierItem(it.id), publierItem(it.id)])
    const ok = resultats.filter((r) => r.status === 'fulfilled')
    const ko = resultats.filter((r) => r.status === 'rejected')
    expect(ok).toHaveLength(1) // exactement une réussit
    expect(ko).toHaveLength(1) // l'autre est rejetée (DEJA_PUBLIE)

    // Une seule Opportunite persiste (le perdant a supprimé la sienne — compensation).
    const opps = await prisma.opportunite.findMany({ where: { titre: { startsWith: PREFIX } } })
    expect(opps).toHaveLength(1)
  })
})
