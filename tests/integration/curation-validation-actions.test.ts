/**
 * @jest-environment node
 *
 * GUIC-600 — US-5 : server actions de la file de curation. INTÉGRATION RÉELLE MariaDB
 * (guichet_mariadb:3307), prisma non mocké. Auth + next/cache = bords mockés.
 */
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import {
  approuverItem,
  rejeterItem,
  mettreEnAttenteItem,
  editerItem,
} from '@/app/admin/curation/actions'

const ADMIN = { cjsUid: 'test-admin-curation', roles: ['admin'] }
const PREFIX = 'test-guic600'
const RUN = Date.now()

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

async function item(
  sourceId: string,
  over: Record<string, unknown> = {},
  createdAt?: Date,
) {
  const url = `https://veille-${RUN}.sn/o/${Math.random().toString(36).slice(2, 10)}`
  return prisma.itemCuration.create({
    data: {
      sourceId,
      urlCanonique: url,
      empreinte: createHash('sha256').update(url).digest('hex'),
      titre: 'Développeur',
      payloadExtrait: { titre: 'Développeur', organisation: 'CJS' } as object,
      statut: 'a_valider',
      ...(createdAt ? { createdAt } : {}),
      ...over,
    },
  })
}

async function purge() {
  await prisma.auditLog.deleteMany({ where: { actorCjsUid: ADMIN.cjsUid } })
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}
beforeAll(purge)
afterEach(async () => {
  await purge()
  jest.clearAllMocks()
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-600 — refus (non-admin)', () => {
  it('approuver/rejeter/attente/éditer refusent sans session admin', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(approuverItem('x')).rejects.toThrow(/FORBIDDEN/)
    mockGetSession.mockResolvedValue({ cjsUid: 'u', roles: ['jeune'] })
    await expect(rejeterItem('x', 'motif')).rejects.toThrow(/FORBIDDEN/)
    await expect(mettreEnAttenteItem('x')).rejects.toThrow(/FORBIDDEN/)
    await expect(editerItem('x', { titre: 'y' })).rejects.toThrow(/FORBIDDEN/)
  })
})

describe('GUIC-600 — actions de validation (DB réelle)', () => {
  beforeEach(() => mockGetSession.mockResolvedValue(ADMIN))

  it('approuver → statut approuvee + traçabilité + audit', async () => {
    const s = await source()
    const it = await item(s.id)
    await approuverItem(it.id)
    const apres = await prisma.itemCuration.findUnique({ where: { id: it.id } })
    expect(apres?.statut).toBe('approuvee')
    expect(apres?.modereePar).toBe(ADMIN.cjsUid)
    expect(apres?.modereeLe).toBeInstanceOf(Date)
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'curation_item.approve', targetId: it.id },
    })
    expect(audit).not.toBeNull()
  })

  it('rejeter → statut rejetee + motif obligatoire + audit', async () => {
    const s = await source()
    const it = await item(s.id)
    await expect(rejeterItem(it.id, '')).rejects.toThrow(/motif/i) // motif requis
    await rejeterItem(it.id, 'Hors périmètre géographique')
    const apres = await prisma.itemCuration.findUnique({ where: { id: it.id } })
    expect(apres?.statut).toBe('rejetee')
    expect(apres?.motifRejet).toBe('Hors périmètre géographique')
  })

  it('mettre en attente → statut en_attente', async () => {
    const s = await source()
    const it = await item(s.id)
    await mettreEnAttenteItem(it.id)
    expect((await prisma.itemCuration.findUnique({ where: { id: it.id } }))?.statut).toBe('en_attente')
  })

  it('éditer → payloadExtrait mis à jour + empreinteContenu recalculée', async () => {
    const s = await source()
    const it = await item(s.id, { empreinteContenu: 'ancienne'.padEnd(64, '0') })
    await editerItem(it.id, { titre: 'Développeur Senior', organisation: 'CJS Tech', region: 'Dakar' })
    const apres = await prisma.itemCuration.findUnique({ where: { id: it.id } })
    expect(apres?.titre).toBe('Développeur Senior')
    const payload = apres?.payloadExtrait as Record<string, unknown>
    expect(payload.titre).toBe('Développeur Senior')
    expect(payload.organisation).toBe('CJS Tech')
    expect(payload.region).toBe('Dakar')
    // Empreinte recalculée (titre/org modifiés) → différente de l'ancienne.
    expect(apres?.empreinteContenu).not.toBe('ancienne'.padEnd(64, '0'))
    expect(apres?.empreinteContenu).toHaveLength(64)
  })

  it('REPROMOTION : rejeter un canonique repromeut son doublon le plus ancien', async () => {
    const s = await source()
    const canon = await item(s.id, {}, new Date(Date.now() - 10000))
    const dup1 = await item(s.id, { statut: 'doublon', doublonDeId: undefined }, new Date(Date.now() - 5000))
    const dup2 = await item(s.id, { statut: 'doublon' }, new Date())
    // Lier les doublons au canonique.
    await prisma.itemCuration.updateMany({
      where: { id: { in: [dup1.id, dup2.id] } },
      data: { doublonDeId: canon.id },
    })

    await rejeterItem(canon.id, 'doublon confirmé, on garde une autre instance')

    const d1 = await prisma.itemCuration.findUnique({ where: { id: dup1.id } })
    const d2 = await prisma.itemCuration.findUnique({ where: { id: dup2.id } })
    // Le plus ancien (dup1) repasse a_valider, délié ; dup2 se re-pointe vers dup1.
    expect(d1?.statut).toBe('a_valider')
    expect(d1?.doublonDeId).toBeNull()
    expect(d2?.statut).toBe('doublon')
    expect(d2?.doublonDeId).toBe(dup1.id)
  })

  it('id inconnu → 404 (erreur NOT_FOUND)', async () => {
    await expect(approuverItem('00000000-0000-0000-0000-000000000000')).rejects.toThrow(/NOT_FOUND/)
  })
})
