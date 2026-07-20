/**
 * @jest-environment node
 *
 * GUIC-599 — US-4 : orchestrateur de déduplication (phase 3). INTÉGRATION RÉELLE
 * MariaDB (guichet_mariadb:3307).
 */
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { executerDedup } from '@/lib/curation/dedup/run'

jest.setTimeout(30000)

const PREFIX = 'test-guic599'
const RUN = Date.now()

async function source() {
  return prisma.sourceVeille.create({
    data: {
      nom: `${PREFIX} src ${Math.random().toString(36).slice(2, 8)}`,
      url: `https://veille-${RUN}-${Math.random().toString(36).slice(2, 8)}.sn/liste`,
      methode: 'rss',
      frequence: 'quotidienne',
    },
  })
}

async function item(
  sourceId: string,
  titre: string,
  organisation: string,
  statut: 'a_valider' | 'approuvee' = 'a_valider',
  createdAt?: Date,
) {
  const url = `https://veille-${RUN}.sn/o/${Math.random().toString(36).slice(2, 10)}`
  return prisma.itemCuration.create({
    data: {
      sourceId,
      urlCanonique: url,
      empreinte: createHash('sha256').update(url).digest('hex'),
      titre,
      payloadExtrait: { titre, organisation } as object,
      statut,
      ...(createdAt ? { createdAt } : {}),
    },
  })
}

afterEach(async () => {
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.opportunite.deleteMany({ where: { titre: { startsWith: PREFIX } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-599 — executerDedup (DB réelle)', () => {
  it('même annonce sur 2 sources → le plus récent devient doublon lié au canonique', async () => {
    const s1 = await source()
    const s2 = await source()
    const canon = await item(s1.id, 'Développeur Backend', 'CJS', 'a_valider', new Date(Date.now() - 5000))
    const dup = await item(s2.id, 'developpeur backend', 'cjs', 'a_valider', new Date())

    await executerDedup()

    const c = await prisma.itemCuration.findUnique({ where: { id: canon.id } })
    const d = await prisma.itemCuration.findUnique({ where: { id: dup.id } })
    expect(c?.statut).toBe('a_valider') // le plus ancien reste
    expect(d?.statut).toBe('doublon')
    expect(d?.doublonDeId).toBe(canon.id)
    expect(c?.empreinteContenu).toHaveLength(64)
  })

  it('annonce unique → reste a_valider, empreinte contenu posée', async () => {
    const s = await source()
    const it = await item(s.id, 'Bourse doctorale unique', 'Université')
    await executerDedup()
    const apres = await prisma.itemCuration.findUnique({ where: { id: it.id } })
    expect(apres?.statut).toBe('a_valider')
    expect(apres?.empreinteContenu).not.toBeNull()
    expect(apres?.doublonDeId).toBeNull()
  })

  it('quasi-doublon (titre proche, même org) → doublon', async () => {
    const s1 = await source()
    const s2 = await source()
    const canon = await item(s1.id, `${PREFIX} Stage marketing digital 2026`, 'Agence', 'a_valider', new Date(Date.now() - 5000))
    const quasi = await item(s2.id, `${PREFIX} Stage marketing digital`, 'Agence', 'a_valider', new Date())

    await executerDedup()

    const d = await prisma.itemCuration.findUnique({ where: { id: quasi.id } })
    expect(d?.statut).toBe('doublon')
    expect(d?.doublonDeId).toBe(canon.id)
  })

  it('déjà publié : match une Opportunite publiée → doublon (pas resoumis)', async () => {
    const s = await source()
    await prisma.opportunite.create({
      data: {
        slug: `${PREFIX}-${RUN}-pub`,
        titre: `${PREFIX} Assistant comptable`,
        description: 'x',
        type: 'Emploi',
        organisation: 'Cabinet Diallo',
        domaine: 'Entrepreneuriat',
        statut: 'publiee',
      },
    })
    const it = await item(s.id, `${PREFIX} Assistant comptable`, 'Cabinet Diallo')

    await executerDedup()

    const apres = await prisma.itemCuration.findUnique({ where: { id: it.id } })
    expect(apres?.statut).toBe('doublon')
  })
})
