/**
 * @jest-environment node
 *
 * GUIC-689 (É-30) — Les compétences requises d'une offre atteignent-elles la base ?
 *
 * INTÉGRATION RÉELLE : prisma n'est pas mocké.
 *
 * Pourquoi ce test existe. É-30 (checklist « Profil recherché — où en es-tu ? »)
 * était classé bloqué par « l'appariement des compétences ». Le relevé en base
 * a montré autre chose : 37 compétences au référentiel, **0 rattachement**
 * opportunité ↔ compétence. La checklist s'afficherait vide sur tout le
 * catalogue.
 *
 * En cherchant qui devait les saisir, il s'avère que le chemin recruteur est
 * complet : le formulaire porte le sélecteur, la page charge le référentiel,
 * l'action mappe `skills` vers `{ skillId }`.
 *
 * Sauf que la seule couverture existante (`recruteur-offre-actions.test.ts`)
 * est MOCKÉE : elle vérifie que les compétences sont transmises au service —
 * la forme de l'appel, pas l'écriture. Un test monté sur un mock ne prouve que
 * la croyance du code sur lui-même.
 *
 * Ici, on écrit vraiment, on relit vraiment.
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))

import { creerOffreRecruteur } from '@/app/recruteur/mes-offres/actions'

const PREFIX = 'GUIC689-skills-'
const RECRUTEUR_UID = 'test-recruteur-689-skills'

const creees: string[] = []
let organisationId: string | null = null
let skillIds: string[] = []

const session = () => ({
  cjsUid: RECRUTEUR_UID, nom: 'T', prenom: 'A', email: null, telephone: null,
  region: null, accessToken: 'x', refreshToken: 'y', expiresAt: 0,
  onboardingComplete: true, roles: ['recruteur'],
})

const offre = {
  type: 'stage' as const,
  titre: `${PREFIX}Stage`,
  description: 'Fixture intégration.',
  domaine: 'Numerique' as const,
  region: 'Dakar' as const,
  dureeMois: 6,
  programmeSlugs: ['yjc'],
}

beforeAll(async () => {
  const org = await prisma.organisation.create({
    data: { nom: `${PREFIX}Organisation`, cjsUid: RECRUTEUR_UID },
    select: { id: true },
  })
  organisationId = org.id

  // Le référentiel est semé (prisma/seed/programmes + skills) : on s'appuie
  // dessus plutôt que d'inventer des compétences qui n'existeraient nulle part.
  const skills = await prisma.skill.findMany({ take: 2, select: { id: true }, orderBy: { slug: 'asc' } })
  skillIds = skills.map((s) => s.id)
})

afterEach(async () => {
  if (creees.length) {
    await prisma.opportunite.deleteMany({ where: { id: { in: creees } } })
    creees.length = 0
  }
})

afterAll(async () => {
  if (organisationId) await prisma.organisation.deleteMany({ where: { id: organisationId } })
  await prisma.$disconnect()
})

describe('GUIC-689 (É-30) — le chemin recruteur écrit vraiment les compétences', () => {
  it('le référentiel de compétences n’est pas vide — sinon le reste ne veut rien dire', () => {
    expect(skillIds.length).toBe(2)
  })

  it('créer une offre avec 2 compétences → 2 lignes en base, rattachées à CETTE offre', async () => {
    mockGetSession.mockResolvedValue(session())
    const { id } = await creerOffreRecruteur({ ...offre, skills: skillIds })
    creees.push(id)

    const liens = await prisma.opportuniteSkill.findMany({
      where: { opportuniteId: id },
      select: { skillId: true, requise: true },
    })
    expect(liens.map((l) => l.skillId).sort()).toEqual([...skillIds].sort())
  })

  it('elles sont marquées REQUISES — c’est ce que la checklist doit pouvoir lire', async () => {
    mockGetSession.mockResolvedValue(session())
    const { id } = await creerOffreRecruteur({ ...offre, skills: [skillIds[0]] })
    creees.push(id)

    const lien = await prisma.opportuniteSkill.findFirstOrThrow({ where: { opportuniteId: id } })
    // `requise` vaut `true` par défaut au schéma. Si un jour une compétence
    // « souhaitée » apparaît, la checklist devra distinguer les deux : ce test
    // le signalera au lieu de laisser le sens dériver en silence.
    expect(lien.requise).toBe(true)
  })

  it('sans compétence choisie → aucune ligne parasite', async () => {
    mockGetSession.mockResolvedValue(session())
    const { id } = await creerOffreRecruteur({ ...offre })
    creees.push(id)

    expect(await prisma.opportuniteSkill.count({ where: { opportuniteId: id } })).toBe(0)
  })

  it('la suppression de l’offre emporte ses rattachements (pas d’orphelin)', async () => {
    mockGetSession.mockResolvedValue(session())
    const { id } = await creerOffreRecruteur({ ...offre, skills: skillIds })

    await prisma.opportunite.delete({ where: { id } })
    expect(await prisma.opportuniteSkill.count({ where: { opportuniteId: id } })).toBe(0)
  })
})
