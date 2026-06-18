/**
 * @jest-environment node
 *
 * Tests de la normalisation FLOUE des compétences (GUIC-278, décision R2).
 * Module pur — aucun mock.
 */
import {
  normalizeLabel,
  diceCoefficient,
  buildSkillIndex,
  matchSkills,
  parseCompetences,
  type SkillRef,
} from '@/lib/ia/graph/skills-normalize'

const SKILLS: SkillRef[] = [
  { id: 's-js', slug: 'javascript', libelle: 'JavaScript' },
  { id: 's-gp', slug: 'gestion-de-projet', libelle: 'Gestion de projet' },
  { id: 's-agri', slug: 'agriculture', libelle: 'Agriculture' },
  { id: 's-compta', slug: 'comptabilite', libelle: 'Comptabilité' },
]
const index = buildSkillIndex(SKILLS)

test('normalizeLabel : minuscule, sans accents, compacté', () => {
  expect(normalizeLabel('  Gestion   de Projet ')).toBe('gestion de projet')
  expect(normalizeLabel('Comptabilité')).toBe('comptabilite')
})

test('diceCoefficient : 1 si identique, 0 si trop court/différent', () => {
  expect(diceCoefficient('python', 'python')).toBe(1)
  expect(diceCoefficient('a', 'b')).toBe(0)
  expect(diceCoefficient('javascript', 'javascrpt')).toBeGreaterThan(0.8)
})

test('matchSkills : correspondance exacte (accents/casse)', () => {
  const m = matchSkills('comptabilité', index)
  expect(m[0]).toMatchObject({ id: 's-compta', score: 1 })
})

test('matchSkills : synonyme « js » → JavaScript', () => {
  const m = matchSkills('JS', index)
  expect(m.map(x => x.id)).toContain('s-js')
})

test('matchSkills : faute de frappe rattrapée par le flou', () => {
  const m = matchSkills('javascrpt', index)
  expect(m[0].id).toBe('s-js')
})

test('matchSkills : synonyme « chef de projet » → Gestion de projet', () => {
  const m = matchSkills('chef de projet', index)
  expect(m.map(x => x.id)).toContain('s-gp')
})

test('matchSkills : terme hors référentiel → aucune correspondance', () => {
  expect(matchSkills('astrophysique quantique', index)).toHaveLength(0)
})

test('matchSkills : containment (intitulé long contenant la compétence)', () => {
  const m = matchSkills('Licence en agriculture durable', index)
  expect(m.map(x => x.id)).toContain('s-agri')
})

test('parseCompetences : array, texte JSON, null, valeurs sales', () => {
  expect(parseCompetences(['JS', 'Python'])).toEqual(['JS', 'Python'])
  expect(parseCompetences('["JS","Python"]')).toEqual(['JS', 'Python'])
  expect(parseCompetences(null)).toEqual([])
  expect(parseCompetences('pas du json')).toEqual([])
  expect(parseCompetences(['ok', '', 42, null])).toEqual(['ok'])
})
