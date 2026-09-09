/**
 * @jest-environment node
 *
 * Lecture du graphe étendue (Lot D) : les nœuds Livre/Exemplaire/Centre et la relation
 * PREPARE étaient PROJETÉS mais jamais interrogés. Deux traversées les exploitent enfin :
 *  - `livre_disponible`      : Livre → Exemplaire (disponible) → Centre → Region
 *    (l'exemple canonique de la note §5.3 : « un livre sur l'agriculture à Thiès ») ;
 *  - `ressources_competences`: offre → compétences MANQUANTES → ressources qui les préparent.
 * Parité Neo4j ↔ fallback Prisma vérifiée sur la même surface.
 */

const port = {
  searchOpportunites: jest.fn(),
  skillGap: jest.fn(),
  eligibleOpportunites: jest.fn(),
  collaborativeReco: jest.fn(),
  multiEntityPath: jest.fn(),
  livresDisponibles: jest.fn(),
  ressourcesPourCompetences: jest.fn(),
}
jest.mock('@/lib/ia/graph', () => ({ getGraphPort: () => port }))

const mockExemplaireFindMany = jest.fn()
const mockSkillFindMany = jest.fn()
const mockRessourceFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: { findMany: jest.fn(async () => []) },
    exemplaire: { findMany: (...a: unknown[]) => mockExemplaireFindMany(...a) },
    skill: { findMany: (...a: unknown[]) => mockSkillFindMany(...a) },
    ressource: { findMany: (...a: unknown[]) => mockRessourceFindMany(...a) },
  },
}))
jest.mock('@/lib/profil-loader', () => ({ loadProfilComplet: jest.fn() }))
jest.mock('@/lib/ia/recommandation', () => ({ getRecommandations: jest.fn() }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

import { TOOLS } from '@/lib/ia/tools'
import { PrismaGraphAdapter } from '@/lib/ia/graph/prisma-adapter'

const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'] }
const qkg = TOOLS.query_knowledge_graph

const livreDispo = {
  livreId: 'l1', titre: 'Agriculture durable', auteur: 'A. Diop', theme: 'Agriculture',
  exemplaireId: 'e1', centreId: 'c1', centreNom: 'Centre de Thiès', region: 'Thies',
  rayon: 'R2', etagere: 'E3', position: 'P4',
}

beforeEach(() => {
  Object.values(port).forEach(fn => fn.mockReset())
  mockExemplaireFindMany.mockReset()
  mockSkillFindMany.mockReset()
  mockRessourceFindMany.mockReset()
})

// ── Intention livre_disponible ────────────────────────────────────────────────

test('livre_disponible : traverse le graphe et rend l’emplacement physique exact', async () => {
  port.livresDisponibles.mockResolvedValueOnce([livreDispo])

  const r = await qkg.execute({ intent: 'livre_disponible', q: 'agriculture', region: 'Thies' }, ctx)

  expect(r.ok).toBe(true)
  expect(port.livresDisponibles).toHaveBeenCalledWith({ q: 'agriculture', theme: undefined, region: 'Thies' })
  const data = r.data as { count: number; livres: Array<{ emplacements: Array<Record<string, string>> }> }
  expect(data.count).toBe(1)
  // L'emplacement (centre · rayon · étagère · position) et l'exemplaireId sont rendus au modèle :
  // sans exemplaireId, `borrow_book` ne peut pas enchaîner sur « emprunte-le ».
  expect(data.livres[0].emplacements[0]).toMatchObject({
    exemplaireId: 'e1', centre: 'Centre de Thiès', rayon: 'R2', etagere: 'E3', position: 'P4',
  })
  expect(r.graph).toEqual({ template: 'livres_disponibles', nodesReturned: 1 })
})

test('livre_disponible : plusieurs exemplaires d’un même livre → une seule card', async () => {
  port.livresDisponibles.mockResolvedValueOnce([
    livreDispo,
    { ...livreDispo, exemplaireId: 'e2', rayon: 'R9' },
  ])

  const r = await qkg.execute({ intent: 'livre_disponible', theme: 'Agriculture' }, ctx)
  const data = r.data as { count: number; livres: Array<{ emplacements: unknown[] }> }
  expect(data.count).toBe(1)
  expect(data.livres[0].emplacements).toHaveLength(2)
})

test('livre_disponible : aucun exemplaire → pas de bloc (Yaye le dit franchement)', async () => {
  port.livresDisponibles.mockResolvedValueOnce([])
  const r = await qkg.execute({ intent: 'livre_disponible', q: 'quantique' }, ctx)
  expect(r.ok).toBe(true)
  expect(r.block).toBeUndefined()
})

// ── Intention ressources_competences ──────────────────────────────────────────

test('ressources_competences : chaîne écart de compétences → ressources préparatoires', async () => {
  port.skillGap.mockResolvedValueOnce({ manquantes: [{ slug: 'excel', libelle: 'Excel' }], formations: [] })
  port.ressourcesPourCompetences.mockResolvedValueOnce([
    { id: 'r1', titre: 'Guide Excel', type: 'PDF', theme: 'Bureautique', niveau: 'Debutant', competences: ['Excel'] },
  ])

  const r = await qkg.execute({ intent: 'ressources_competences', opportuniteId: 'opp-1' }, ctx)

  expect(port.skillGap).toHaveBeenCalledWith(expect.objectContaining({ cjsUid: 'u-1' }), 'opp-1')
  expect(port.ressourcesPourCompetences).toHaveBeenCalledWith(['excel'])
  expect(r.block).toEqual({
    kind: 'ressources',
    items: [{ id: 'r1', titre: 'Guide Excel', type: 'PDF', theme: 'Bureautique', niveau: 'Debutant' }],
  })
  expect((r.data as { manquantes: string[] }).manquantes).toEqual(['Excel'])
})

test('ressources_competences : sans opportuniteId → erreur explicite', async () => {
  const r = await qkg.execute({ intent: 'ressources_competences' }, ctx)
  expect(r.ok).toBe(false)
  expect(port.ressourcesPourCompetences).not.toHaveBeenCalled()
})

test('ressources_competences : aucune compétence manquante → aucune requête ressources', async () => {
  port.skillGap.mockResolvedValueOnce({ manquantes: [], formations: [] })
  const r = await qkg.execute({ intent: 'ressources_competences', opportuniteId: 'opp-1' }, ctx)
  expect(r.ok).toBe(true)
  expect(port.ressourcesPourCompetences).not.toHaveBeenCalled()
})

// ── Parité du fallback Prisma ─────────────────────────────────────────────────

test('fallback Prisma : livresDisponibles filtre disponibilité + région et rend l’emplacement', async () => {
  mockExemplaireFindMany.mockResolvedValueOnce([
    {
      id: 'e1', rayon: 'R2', etagere: 'E3', position: 'P4',
      livre: { id: 'l1', titre: 'Agriculture durable', auteur: 'A. Diop', theme: 'Agriculture' },
      centre: { id: 'c1', nom: 'Centre de Thiès', region: 'Thies' },
    },
  ])

  const out = await new PrismaGraphAdapter().livresDisponibles({ q: 'agri', region: 'Thies' })

  const where = mockExemplaireFindMany.mock.calls[0][0].where
  expect(where.statut).toBe('disponible')
  expect(where.centre).toEqual({ region: 'Thies' })
  expect(out[0]).toMatchObject({ livreId: 'l1', exemplaireId: 'e1', centreNom: 'Centre de Thiès', rayon: 'R2' })
})

test('fallback Prisma : ressourcesPourCompetences rejoue la dérivation thème ↔ catégorie', async () => {
  mockSkillFindMany.mockResolvedValueOnce([
    { id: 'sk-1', slug: 'excel', libelle: 'Excel', categorie: 'Bureautique' },
    { id: 'sk-2', slug: 'soudure', libelle: 'Soudure', categorie: 'Technique' },
  ])
  mockRessourceFindMany.mockResolvedValueOnce([
    { id: 'r1', titre: 'Guide Excel', type: 'PDF', theme: 'Bureautique', niveau: 'Debutant' },
    { id: 'r2', titre: 'Guide Soudure', type: 'PDF', theme: 'Technique', niveau: null },
  ])

  const out = await new PrismaGraphAdapter().ressourcesPourCompetences(['excel'])

  expect(out).toHaveLength(1)
  expect(out[0]).toMatchObject({ id: 'r1', competences: ['Excel'] })
})

test('fallback Prisma : slugs vides → aucune requête', async () => {
  const out = await new PrismaGraphAdapter().ressourcesPourCompetences([])
  expect(out).toEqual([])
  expect(mockSkillFindMany).not.toHaveBeenCalled()
})
