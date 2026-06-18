/**
 * @jest-environment node
 *
 * Tests des traversées du fallback PrismaGraphAdapter (GUIC-433).
 * Vérifie l'écart de compétences (flou), l'éligibilité par niveau, et la reco
 * collaborative agrégée. Prisma mocké.
 */

const m = {
  oppFindMany: jest.fn(),
  oppFindFirst: jest.fn(),
  oppSkillFindMany: jest.fn(),
  profilFindUnique: jest.fn(),
  skillFindMany: jest.fn(),
  candidatureFindMany: jest.fn(),
}
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: { findMany: (...a: unknown[]) => m.oppFindMany(...a), findFirst: (...a: unknown[]) => m.oppFindFirst(...a) },
    opportuniteSkill: { findMany: (...a: unknown[]) => m.oppSkillFindMany(...a) },
    profilJeune: { findUnique: (...a: unknown[]) => m.profilFindUnique(...a) },
    skill: { findMany: (...a: unknown[]) => m.skillFindMany(...a) },
    candidature: { findMany: (...a: unknown[]) => m.candidatureFindMany(...a) },
  },
}))

import { PrismaGraphAdapter } from '@/lib/ia/graph/prisma-adapter'

const SKILLS = [
  { id: 's-js', slug: 'javascript', libelle: 'JavaScript' },
  { id: 's-react', slug: 'react', libelle: 'React' },
]
const scope = { cjsUid: 'u-1' }

beforeEach(() => Object.values(m).forEach(fn => fn.mockReset()))

test('skillGap : compétence requise non maîtrisée → manquante + formation proposée', async () => {
  // requise: React ; maîtrisée (flou via profil): JavaScript
  m.oppSkillFindMany
    .mockResolvedValueOnce([{ skill: { id: 's-react', slug: 'react', libelle: 'React' } }]) // required
    .mockResolvedValueOnce([{ opportunite: { id: 'f1', slug: 'form-react', titre: 'Form React', type: 'formation', region: 'Dakar', organisation: null, organisationLibelle: 'CJS', deadline: null } }]) // dev
  m.profilFindUnique.mockResolvedValueOnce({ competences: ['JavaScript'] })
  m.skillFindMany.mockResolvedValueOnce(SKILLS)

  const gap = await new PrismaGraphAdapter().skillGap(scope, 'opp-1')
  expect(gap.manquantes.map(c => c.slug)).toEqual(['react'])
  expect(gap.formations[0]).toMatchObject({ id: 'f1', organisation: 'CJS' })
})

test('skillGap : tout maîtrisé → aucune manquante, pas de requête formation', async () => {
  m.oppSkillFindMany.mockResolvedValueOnce([{ skill: { id: 's-js', slug: 'javascript', libelle: 'JavaScript' } }])
  m.profilFindUnique.mockResolvedValueOnce({ competences: ['js'] }) // synonyme → maîtrise JS
  m.skillFindMany.mockResolvedValueOnce(SKILLS)

  const gap = await new PrismaGraphAdapter().skillGap(scope, 'opp-1')
  expect(gap.manquantes).toHaveLength(0)
  expect(gap.formations).toHaveLength(0)
  // la 2e requête (formations) ne doit pas être lancée
  expect(m.oppSkillFindMany).toHaveBeenCalledTimes(1)
})

test('eligibleOpportunites : filtre par niveau autorisé + exclut déjà postulées', async () => {
  m.profilFindUnique.mockResolvedValueOnce({ niveauEtude: 'BAC' })
  m.candidatureFindMany.mockResolvedValueOnce([{ opportuniteId: 'deja' }])
  m.oppFindMany.mockResolvedValueOnce([
    { id: 'o2', slug: 's2', titre: 'T2', type: 'emploi', region: 'Thies', organisation: 'X', organisationLibelle: null, deadline: null },
  ])

  const out = await new PrismaGraphAdapter().eligibleOpportunites(scope)
  expect(out[0].id).toBe('o2')
  const where = m.oppFindMany.mock.calls[0][0].where
  expect(where.id).toEqual({ notIn: ['deja'] })
  expect(where.OR).toEqual([{ niveauEtudeMin: null }, { niveauEtudeMin: { in: ['BFEM', 'BAC'] } }])
})

test('collaborativeReco : agrège la popularité, jamais d\'attribut peer, exclut déjà postulées', async () => {
  m.candidatureFindMany
    .mockResolvedValueOnce([{ opportuniteId: 'A' }]) // mine
    .mockResolvedValueOnce([{ cjsUid: 'peer1' }, { cjsUid: 'peer2' }]) // peers
    .mockResolvedValueOnce([ // peerApps
      { cjsUid: 'peer1', opportuniteId: 'B' },
      { cjsUid: 'peer2', opportuniteId: 'B' },
      { cjsUid: 'peer1', opportuniteId: 'C' },
    ])
  m.oppFindMany.mockResolvedValueOnce([
    { id: 'B', slug: 'b', titre: 'Offre B' },
    { id: 'C', slug: 'c', titre: 'Offre C' },
  ])

  const out = await new PrismaGraphAdapter().collaborativeReco(scope)
  expect(out[0]).toEqual({ id: 'B', slug: 'b', titre: 'Offre B', popularite: 2 })
  expect(out[1].popularite).toBe(1)
  // sortie agrégée : pas de cjsUid d'un peer
  expect(JSON.stringify(out)).not.toContain('peer')
})

test('collaborativeReco : aucune candidature → vide (court-circuit)', async () => {
  m.candidatureFindMany.mockResolvedValueOnce([])
  const out = await new PrismaGraphAdapter().collaborativeReco(scope)
  expect(out).toEqual([])
  expect(m.oppFindMany).not.toHaveBeenCalled()
})
