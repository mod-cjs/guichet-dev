/**
 * @jest-environment node
 *
 * GUIC-684 — Vérification des invariants de rattachement.
 *
 * Les invariants (« au plus un principal », « au moins un programme sur un contenu »)
 * sont garantis CÔTÉ APPLICATIF : rien en base ne les impose. Or la base est aussi
 * écrite par des scripts SQL (dataset enrichi), des migrations et des backfills — la
 * seule garantie applicative ne couvre pas ces chemins.
 *
 * La spec annonçait un job d'intégrité : sans lui, la promesse est verbale.
 * INTÉGRATION RÉELLE (prisma non mocké).
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

import { checkProgrammeIntegrity } from '@/lib/programmes/integrity'

const PREFIX = 'GUIC684-integrity-'
const ressources: string[] = []

async function ressourceAvec(slugs: { slug: string; principal: boolean }[]): Promise<string> {
  const r = await prisma.ressource.create({
    data: {
      titre: `${PREFIX}${Math.random().toString(36).slice(2, 8)}`,
      description: 'Fixture intégrité.',
      type: 'PDF',
      theme: 'Emploi',
      url: 'https://example.org/i.pdf',
    },
    select: { id: true },
  })
  ressources.push(r.id)

  for (const s of slugs) {
    const p = await prisma.programme.findUniqueOrThrow({ where: { slug: s.slug } })
    await prisma.ressourceProgramme.create({
      data: { ressourceId: r.id, programmeId: p.id, principal: s.principal },
    })
  }
  return r.id
}

afterEach(async () => {
  if (ressources.length) {
    await prisma.ressource.deleteMany({ where: { id: { in: ressources } } })
    ressources.length = 0
  }
})
afterAll(async () => { await prisma.$disconnect() })

describe('GUIC-684 — checkProgrammeIntegrity', () => {
  it('ne signale rien sur un rattachement sain', async () => {
    const id = await ressourceAvec([
      { slug: 'yeah', principal: true },
      { slug: 'edupop', principal: false },
    ])

    const issues = await checkProgrammeIntegrity()
    expect(issues.filter((i) => i.entiteId === id)).toHaveLength(0)
  })

  it('signale DEUX principaux — l’UI n’aurait aucun badge déterministe à afficher', async () => {
    const id = await ressourceAvec([
      { slug: 'yeah', principal: true },
      { slug: 'edupop', principal: true },
    ])

    const issues = await checkProgrammeIntegrity()
    const issue = issues.find((i) => i.entiteId === id)
    expect(issue).toMatchObject({ entite: 'ressource', raison: 'PLUSIEURS_PRINCIPAUX' })
  })

  it('signale AUCUN principal — le Data Hub servirait un programme arbitraire', async () => {
    const id = await ressourceAvec([{ slug: 'yeah', principal: false }])

    const issues = await checkProgrammeIntegrity()
    expect(issues.find((i) => i.entiteId === id)).toMatchObject({ raison: 'AUCUN_PRINCIPAL' })
  })

  it('signale un contenu sans aucun programme (invariant obligatoire)', async () => {
    const id = await ressourceAvec([])

    const issues = await checkProgrammeIntegrity()
    expect(issues.find((i) => i.entiteId === id)).toMatchObject({ raison: 'SANS_PROGRAMME' })
  })

  it('ne signale PAS un acteur sans programme — le régime y est facultatif', async () => {
    const centre = await prisma.centre.create({
      data: {
        nom: `${PREFIX}Centre`, region: 'Dakar', adresse: 'x', latitude: 14.7, longitude: -17.4,
        telephone: '+221771234567', responsable: 'R',
      },
      select: { id: true },
    })

    const issues = await checkProgrammeIntegrity()
    expect(issues.find((i) => i.entiteId === centre.id)).toBeUndefined()

    await prisma.centre.delete({ where: { id: centre.id } })
  })
})
