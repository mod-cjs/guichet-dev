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

// Scope d'isolation : `executerDedup` scanne globalement ; on lui passe UNIQUEMENT les
// sources créées par ce test → aucune interférence avec les autres fichiers en parallèle.
let sourceIds: string[] = []

async function source() {
  const s = await prisma.sourceVeille.create({
    data: {
      nom: `${PREFIX} src ${Math.random().toString(36).slice(2, 8)}`,
      url: `https://veille-${RUN}-${Math.random().toString(36).slice(2, 8)}.sn/liste`,
      methode: 'rss',
      frequence: 'quotidienne',
    },
  })
  sourceIds.push(s.id)
  return s
}
const dedup = () => executerDedup({ sourceIds })

async function item(
  sourceId: string,
  titre: string | null,
  organisation: string,
  statut: 'a_valider' | 'approuvee' = 'a_valider',
  createdAt?: Date,
  deadline?: string,
) {
  const url = `https://veille-${RUN}.sn/o/${Math.random().toString(36).slice(2, 10)}`
  return prisma.itemCuration.create({
    data: {
      sourceId,
      urlCanonique: url,
      empreinte: createHash('sha256').update(url).digest('hex'),
      titre,
      payloadExtrait: { titre, organisation, ...(deadline ? { deadline } : {}) } as object,
      statut,
      ...(createdAt ? { createdAt } : {}),
    },
  })
}

// `executerDedup` scanne TOUS les items `a_valider` : un reste de run tué polluerait
// le choix du canonique. On purge le préfixe avant la 1re exécution.
async function purge() {
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.opportunite.deleteMany({ where: { titre: { startsWith: PREFIX } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  sourceIds = []
}
beforeAll(purge)
afterEach(purge)
afterAll(async () => {
  await prisma.$disconnect()
})

describe('GUIC-599 — executerDedup (DB réelle)', () => {
  it('même annonce sur 2 sources → le plus récent devient doublon lié au canonique', async () => {
    const s1 = await source()
    const s2 = await source()
    const canon = await item(s1.id, 'Développeur Backend', 'CJS', 'a_valider', new Date(Date.now() - 5000))
    const dup = await item(s2.id, 'developpeur backend', 'cjs', 'a_valider', new Date())

    await dedup()

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
    await dedup()
    const apres = await prisma.itemCuration.findUnique({ where: { id: it.id } })
    expect(apres?.statut).toBe('a_valider')
    expect(apres?.empreinteContenu).not.toBeNull()
    expect(apres?.doublonDeId).toBeNull()
  })

  it('quasi-doublon (titre proche, même org, même deadline) → doublon', async () => {
    const s1 = await source()
    const s2 = await source()
    // Titres réalistes (pas de préfixe qui gonflerait le Jaccard) + org + deadline concordantes.
    const canon = await item(s1.id, 'Stage communication institutionnelle senior', 'Agence Baobab', 'a_valider', new Date(Date.now() - 5000), '2026-09-30')
    const quasi = await item(s2.id, 'Stage communication institutionnelle', 'Agence Baobab', 'a_valider', new Date(), '2026-09-30')

    await dedup()

    const d = await prisma.itemCuration.findUnique({ where: { id: quasi.id } })
    expect(d?.statut).toBe('doublon')
    expect(d?.doublonDeId).toBe(canon.id)
  })

  it('C-1 : même titre+employeur mais DEADLINES différentes → 2 annonces distinctes, PAS de fusion', async () => {
    const s1 = await source()
    const s2 = await source()
    const a = await item(s1.id, 'Chargé de projet', 'ONG Teranga', 'a_valider', new Date(Date.now() - 5000), '2026-08-31')
    const b = await item(s2.id, 'Chargé de projet', 'ONG Teranga', 'a_valider', new Date(), '2026-11-30')

    await dedup()

    expect((await prisma.itemCuration.findUnique({ where: { id: a.id } }))?.statut).toBe('a_valider')
    expect((await prisma.itemCuration.findUnique({ where: { id: b.id } }))?.statut).toBe('a_valider')
  })

  it('M-1 : item SANS organisation → jamais marqué doublon (anti-masquage)', async () => {
    const s = await source()
    // Une Opportunite publiée au même titre existe, mais l'item n'a pas d'org.
    await prisma.opportunite.create({
      data: { slug: `${PREFIX}-${RUN}-noorg`, titre: `${PREFIX} Appel à candidatures`, description: 'x', type: 'Emploi', organisation: 'Société X', domaine: 'Autre', statut: 'publiee' },
    })
    const it = await item(s.id, `${PREFIX} Appel à candidatures`, '', 'a_valider')

    await dedup()

    const apres = await prisma.itemCuration.findUnique({ where: { id: it.id } })
    expect(apres?.statut).toBe('a_valider') // pas de dédup sur titre seul
  })

  it('M-2 : un item SANS titre ne famine pas le lot ni n’est re-sélectionné', async () => {
    const s = await source()
    const sansTitre = await item(s.id, null, 'Org')
    // Un item titré valide, plus récent, doit quand même être examiné.
    const titre = await item(s.id, 'Bourse unique xyz', 'Fondation')

    await dedup()

    const st = await prisma.itemCuration.findUnique({ where: { id: sansTitre.id } })
    const ti = await prisma.itemCuration.findUnique({ where: { id: titre.id } })
    expect(st?.statut).toBe('a_valider') // pas dédupliqué (pas de titre)
    expect(ti?.empreinteContenu).not.toBeNull() // l'item titré a bien été examiné
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

    await dedup()

    const apres = await prisma.itemCuration.findUnique({ where: { id: it.id } })
    expect(apres?.statut).toBe('doublon')
  })
})
