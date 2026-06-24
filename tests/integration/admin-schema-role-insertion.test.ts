/**
 * @jest-environment node
 *
 * GUIC-469 — Schéma rôle (cache SSO) + modèle Insertion. INTÉGRATION RÉELLE MariaDB :
 * prouve que la migration (champ `role` + table `insertions` + FK) fonctionne en base.
 * DATABASE_URL → docker gj-maria 3307.
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const UID = `test-guic469-${Date.now()}`
const insertionIds: string[] = []

afterAll(async () => {
  if (insertionIds.length) await prisma.insertion.deleteMany({ where: { id: { in: insertionIds } } })
  await prisma.utilisateur.deleteMany({ where: { cjsUid: UID } })
  await prisma.$disconnect()
})

describe('GUIC-469 — rôle + Insertion (DB réelle)', () => {
  it('le champ `role` est persisté et relu sur Utilisateur', async () => {
    await prisma.utilisateur.create({
      data: { cjsUid: UID, nom: 'Test', prenom: 'Role', role: 'conseiller' },
    })
    const u = await prisma.utilisateur.findUnique({ where: { cjsUid: UID }, select: { role: true } })
    expect(u?.role).toBe('conseiller')
  })

  it('le champ `role` est filtrable (groupBy) pour la table admin', async () => {
    const grouped = await prisma.utilisateur.groupBy({
      by: ['role'],
      where: { cjsUid: UID },
      _count: { cjsUid: true },
    })
    expect(grouped.find((g) => g.role === 'conseiller')?._count.cjsUid).toBe(1)
  })

  it('une Insertion liée à un jeune + un centre se crée, se compte et se supprime', async () => {
    const centre = await prisma.centre.findFirst({ select: { id: true } })
    const ins = await prisma.insertion.create({
      data: { cjsUid: UID, centreId: centre?.id ?? null, type: 'emploi' },
      select: { id: true, centreId: true, dateInsertion: true },
    })
    insertionIds.push(ins.id)
    expect(ins.dateInsertion).toBeInstanceOf(Date)

    // Comptage = base du taux d'insertion par centre
    const count = await prisma.insertion.count({ where: { cjsUid: UID } })
    expect(count).toBe(1)

    await prisma.insertion.delete({ where: { id: ins.id } })
    insertionIds.length = 0
    expect(await prisma.insertion.findUnique({ where: { id: ins.id } })).toBeNull()
  })

  it('la FK insertions→utilisateurs refuse un cjsUid inexistant (intégrité)', async () => {
    await expect(
      prisma.insertion.create({ data: { cjsUid: 'inexistant-xyz', type: 'stage' } }),
    ).rejects.toThrow()
  })
})
