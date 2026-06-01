/**
 * Tests unitaires des seeds M3 v2 — GUIC-182 (178a/4).
 * Vérifie l'intégrité des données seed sans DB réelle (import direct).
 */

import { PROGRAMMES_SEED } from '../../prisma/seed/programmes'
import { OPPORTUNITE_TYPES_SEED } from '../../prisma/seed/opportunite-types'
import { SKILLS_SEED } from '../../prisma/seed/skills'
import { TAGS_SEED } from '../../prisma/seed/tags'

// Slug URL-safe : lettres minuscules, chiffres, tirets, underscores
const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/

function expectAllSlugsUniqueAndUrlSafe<T extends { slug: string }>(items: T[]): void {
  const slugs = items.map(i => i.slug)
  expect(new Set(slugs).size).toBe(items.length)
  for (const slug of slugs) {
    expect(slug).toMatch(SLUG_RE)
  }
}

describe('Seed M3 v2 — Programme', () => {
  it('expose exactement 4 programmes sectoriels', () => {
    expect(PROGRAMMES_SEED).toHaveLength(4)
    expect(PROGRAMMES_SEED.map(p => p.slug).sort()).toEqual(['edupop', 'yaakaar', 'yeah', 'yjc'])
  })

  it('exclut BRM (outil interne — décision Lead 2026-05-29)', () => {
    const slugs = PROGRAMMES_SEED.map(p => p.slug)
    expect(slugs).not.toContain('brm')
  })

  it('chaque programme a un gradient_token --prog-*', () => {
    for (const p of PROGRAMMES_SEED) {
      expect(p.gradientToken).toMatch(/^var\(--prog-[a-z]+\)$/)
    }
  })

  it('slugs uniques et URL-safe', () => {
    expectAllSlugsUniqueAndUrlSafe(PROGRAMMES_SEED)
  })
})

describe('Seed M3 v2 — OpportuniteType', () => {
  it('expose exactement 10 types (6 initiaux + 4 ajoutés après audit site officiel guichetjeunesse.sn)', () => {
    expect(OPPORTUNITE_TYPES_SEED).toHaveLength(10)
    expect(OPPORTUNITE_TYPES_SEED.map(t => t.slug).sort()).toEqual([
      'appel_a_projets',
      'bourse',
      'concours',
      'emploi',
      'financement',
      'formation',
      'mentorat',
      'mobilite',
      'stage',
      'volontariat',
    ])
  })

  it('financement est distinct d\'appel_a_projets (microcrédit / subvention au fil de l\'eau, pas de jury de sélection)', () => {
    const financement = OPPORTUNITE_TYPES_SEED.find(t => t.slug === 'financement')!
    expect(financement.decisionAuthority).toBe('officier_credit')
    expect(financement.actionLabel).toBe('Demander')
  })

  it('mentorat, mobilité et volontariat sont alignés avec les types CJS', () => {
    const mentorat = OPPORTUNITE_TYPES_SEED.find(t => t.slug === 'mentorat')!
    const mobilite = OPPORTUNITE_TYPES_SEED.find(t => t.slug === 'mobilite')!
    const volontariat = OPPORTUNITE_TYPES_SEED.find(t => t.slug === 'volontariat')!
    expect(mentorat.decisionAuthority).toBe('jury')
    expect(mobilite.decisionAuthority).toBe('commission')
    expect(volontariat.decisionAuthority).toBe('organisation_accueil')
  })

  it('chaque type a un actionLabel non vide', () => {
    for (const t of OPPORTUNITE_TYPES_SEED) {
      expect(t.actionLabel).toBeTruthy()
      expect(t.actionLabel.length).toBeGreaterThan(0)
    }
  })

  it('emploi et stage demandent un upload (CV)', () => {
    const emploi = OPPORTUNITE_TYPES_SEED.find(t => t.slug === 'emploi')!
    const stage = OPPORTUNITE_TYPES_SEED.find(t => t.slug === 'stage')!
    expect(emploi.requiresFileUpload).toBe(true)
    expect(emploi.fileLabel).toContain('CV')
    expect(stage.requiresFileUpload).toBe(true)
    expect(stage.fileLabel).toContain('CV')
  })

  it('formation ne demande pas d\'upload obligatoire (auto-inscription)', () => {
    const formation = OPPORTUNITE_TYPES_SEED.find(t => t.slug === 'formation')!
    expect(formation.requiresFileUpload).toBe(false)
    expect(formation.decisionAuthority).toBe('auto')
  })

  it('appel_a_projets demande un dossier (note + budget) jugé par comité', () => {
    const aap = OPPORTUNITE_TYPES_SEED.find(t => t.slug === 'appel_a_projets')!
    expect(aap.requiresFileUpload).toBe(true)
    expect(aap.fileLabel).toMatch(/budget/i)
    expect(aap.decisionAuthority).toBe('comite_financement')
  })

  it('ordre strictement croissant et unique', () => {
    const ordres = OPPORTUNITE_TYPES_SEED.map(t => t.ordre)
    expect(new Set(ordres).size).toBe(ordres.length)
    for (let i = 1; i < ordres.length; i++) {
      expect(ordres[i]).toBeGreaterThan(ordres[i - 1])
    }
  })

  it('slugs uniques et URL-safe', () => {
    expectAllSlugsUniqueAndUrlSafe(OPPORTUNITE_TYPES_SEED)
  })
})

describe('Seed M3 v2 — Skill', () => {
  it('expose entre 30 et 60 entrées (seed initial CJS)', () => {
    expect(SKILLS_SEED.length).toBeGreaterThanOrEqual(30)
    expect(SKILLS_SEED.length).toBeLessThanOrEqual(60)
  })

  it('couvre les 8 catégories CJS', () => {
    const categories = new Set(SKILLS_SEED.map(s => s.categorie))
    expect(categories).toEqual(new Set([
      'bureautique',
      'linguistique',
      'communication',
      'gestion',
      'metier_manuel',
      'agriculture',
      'digital',
      'vente_services',
    ]))
  })

  it('chaque catégorie a au moins 3 skills', () => {
    const byCat = new Map<string, number>()
    for (const s of SKILLS_SEED) {
      byCat.set(s.categorie, (byCat.get(s.categorie) ?? 0) + 1)
    }
    for (const [cat, count] of byCat) {
      expect({ cat, count }).toMatchObject({ count: expect.any(Number) })
      expect(count).toBeGreaterThanOrEqual(3)
    }
  })

  it('slugs uniques et URL-safe', () => {
    expectAllSlugsUniqueAndUrlSafe(SKILLS_SEED)
  })
})

describe('Seed M3 v2 — Tag', () => {
  it('expose exactement 7 tags transversaux', () => {
    expect(TAGS_SEED).toHaveLength(7)
    expect(TAGS_SEED.map(t => t.slug).sort()).toEqual([
      'diaspora',
      'nouveau',
      'priorite-femmes',
      'priorite-handicap',
      'priorite-rural',
      'remote',
      'urgent',
    ])
  })

  it('slugs uniques et URL-safe', () => {
    expectAllSlugsUniqueAndUrlSafe(TAGS_SEED)
  })
})
