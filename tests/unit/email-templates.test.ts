/**
 * @jest-environment node
 *
 * Tests des templates d'emails du pipeline recruteur (GUIC-553 évolution) :
 * intégrité du jeu, rendu des variables, résolution des surcharges.
 */
const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { emailTemplate: { findMany: (...a: unknown[]) => mockFindMany(...a) } },
}))

import {
  RECRUTEUR_TEMPLATES,
  getTemplateDef,
  renderTemplate,
  resolveTemplate,
  resolveAllTemplates,
} from '@/lib/email/templates'

beforeEach(() => {
  jest.clearAllMocks()
  mockFindMany.mockResolvedValue([])
})

describe('jeu de templates', () => {
  it('couvre les cas du pipeline (≥ 10, clés uniques, préfixe pipeline.)', () => {
    expect(RECRUTEUR_TEMPLATES.length).toBeGreaterThanOrEqual(10)
    const cles = RECRUTEUR_TEMPLATES.map((t) => t.cle)
    expect(new Set(cles).size).toBe(cles.length)
    for (const cle of cles) expect(cle).toMatch(/^pipeline\.[a-z_]+$/)
  })

  it('chaque template a un sujet et un corps avec au moins une variable', () => {
    for (const t of RECRUTEUR_TEMPLATES) {
      expect(t.sujet.length).toBeGreaterThan(5)
      expect(t.corps).toMatch(/\{\{\s*prenom\s*\}\}/)
    }
  })
})

describe('renderTemplate', () => {
  it('remplace les variables connues', () => {
    const out = renderTemplate('Bonjour {{prenom}}, poste {{offre}} chez {{organisation}}.', {
      prenom: 'Awa',
      offre: 'Stage agro',
      organisation: 'CJS',
    })
    expect(out).toBe('Bonjour Awa, poste Stage agro chez CJS.')
  })

  it('vide les variables absentes et compacte les lignes vides', () => {
    const out = renderTemplate('A\n\n{{complement}}\n\nB', {})
    expect(out).toBe('A\n\nB')
  })
})

describe('resolveTemplate — priorité recruteur > système > défaut', () => {
  it('sans surcharge, renvoie le défaut du code', async () => {
    const t = await resolveTemplate('pipeline.retenue', 'rec-1')
    expect(t).toMatchObject({ source: 'defaut' })
    expect(t?.sujet).toContain('retenue')
  })

  it('la version système (admin) prime sur le défaut', async () => {
    mockFindMany.mockResolvedValue([{ cle: 'pipeline.retenue', ownerUid: '', sujet: 'S-admin', corps: 'C-admin' }])
    const t = await resolveTemplate('pipeline.retenue', 'rec-1')
    expect(t).toMatchObject({ source: 'systeme', sujet: 'S-admin' })
  })

  it('la version du recruteur prime sur la version système', async () => {
    mockFindMany.mockResolvedValue([
      { cle: 'pipeline.retenue', ownerUid: '', sujet: 'S-admin', corps: 'C-admin' },
      { cle: 'pipeline.retenue', ownerUid: 'rec-1', sujet: 'S-perso', corps: 'C-perso' },
    ])
    const t = await resolveTemplate('pipeline.retenue', 'rec-1')
    expect(t).toMatchObject({ source: 'recruteur', sujet: 'S-perso' })
  })

  it('clé inconnue → null', async () => {
    expect(await resolveTemplate('pipeline.inconnu', 'rec-1')).toBeNull()
  })
})

describe('resolveAllTemplates', () => {
  it('renvoie tout le jeu avec la bonne provenance par template', async () => {
    mockFindMany.mockResolvedValue([{ cle: 'pipeline.refus', ownerUid: 'rec-1', sujet: 'S', corps: 'C' }])
    const all = await resolveAllTemplates('rec-1')
    expect(all.length).toBe(RECRUTEUR_TEMPLATES.length)
    expect(all.find((t) => t.cle === 'pipeline.refus')?.source).toBe('recruteur')
    expect(all.find((t) => t.cle === 'pipeline.retenue')?.source).toBe('defaut')
  })
})
