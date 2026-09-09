/**
 * @jest-environment node
 *
 * GUIC-689 — Matricule de membre CJS, imprimé sur la carte.
 *
 * Format retenu, repris de la maquette (`cjs-card.jsx` L.169) :
 *   `GJ-<année d'inscription>-<5 chiffres><lettre de contrôle>`
 *
 * C'est un identifiant PUBLIC — lisible, dictable au comptoir — à la différence
 * de `cjsUid`, identifiant technique inter-plateformes qui n'a pas vocation à
 * être affiché ni prononcé.
 *
 * Deux exigences non négociables :
 *  1. il ne doit pas être DEVINABLE à partir d'un autre (sinon on peut réclamer
 *     l'identité d'autrui au comptoir) — d'où une part aléatoire, pas un
 *     compteur ;
 *  2. une faute de saisie doit être DÉTECTABLE, sinon un agent valide le mauvais
 *     dossier — d'où la lettre de contrôle.
 */
import { genererMatricule, matriculeValide, lettreControle } from '@/lib/membre/matricule'

const ANNEE = new Date('2026-03-14T00:00:00.000Z')

describe('GUIC-689 — format du matricule', () => {
  it('respecte le format de la maquette', () => {
    expect(genererMatricule(ANNEE)).toMatch(/^GJ-2026-\d{5}[A-Z]$/)
  })

  it('porte l’année d’inscription, pas l’année courante', () => {
    expect(genererMatricule(new Date('2019-11-02T00:00:00.000Z'))).toMatch(/^GJ-2019-/)
  })

  it('se valide lui-même', () => {
    for (let i = 0; i < 50; i++) expect(matriculeValide(genererMatricule(ANNEE))).toBe(true)
  })
})

describe('GUIC-689 — la lettre de contrôle détecte les fautes de saisie', () => {
  it('rejette un chiffre modifié', () => {
    const m = 'GJ-2026-77294' + lettreControle('GJ-2026-77294')
    expect(matriculeValide(m)).toBe(true)
    // Un seul chiffre change : la lettre ne colle plus.
    const faux = m.replace('77294', '77295')
    expect(matriculeValide(faux)).toBe(false)
  })

  it('rejette deux chiffres intervertis — la faute de frappe la plus courante', () => {
    const base = 'GJ-2026-12345'
    const m = base + lettreControle(base)
    const interverti = 'GJ-2026-12435' + lettreControle(base)
    expect(matriculeValide(m)).toBe(true)
    expect(matriculeValide(interverti)).toBe(false)
  })

  it('rejette une année altérée', () => {
    const base = 'GJ-2026-12345'
    const m = base + lettreControle(base)
    expect(matriculeValide('GJ-2025-12345' + m.slice(-1))).toBe(false)
  })

  it('rejette les formes malformées', () => {
    for (const mauvais of ['', 'GJ-2026-1234A', 'GJ-26-12345A', '2026-12345A', 'GJ-2026-12345', 'gj-2026-12345a']) {
      expect(matriculeValide(mauvais)).toBe(false)
    }
  })
})

describe('GUIC-689 — lisible à voix haute', () => {
  /**
   * Le matricule se dicte au comptoir et se recopie à la main. `O` face à `0`,
   * `I` face à `1` : la confusion est garantie, et elle porterait sur la lettre
   * de CONTRÔLE — celle qui doit précisément détecter les erreurs de saisie.
   */
  it('la lettre de contrôle n’emploie jamais un caractère ambigu', () => {
    const lettres = new Set(
      Array.from({ length: 500 }, () => genererMatricule(ANNEE).slice(-1)),
    )
    for (const l of lettres) expect('IO').not.toContain(l)
  })

  it('couvre tout de même un alphabet large — le contrôle garde sa force', () => {
    const lettres = new Set(
      Array.from({ length: 2000 }, () => genererMatricule(ANNEE).slice(-1)),
    )
    expect(lettres.size).toBeGreaterThanOrEqual(20)
  })
})

describe('GUIC-689 — non devinable', () => {
  it('deux matricules de la même année diffèrent', () => {
    const lot = new Set(Array.from({ length: 200 }, () => genererMatricule(ANNEE)))
    // Collision possible mais rarissime sur 100 000 combinaisons ; on vérifie
    // surtout qu'aucun compteur séquentiel ne se cache derrière.
    expect(lot.size).toBeGreaterThan(190)
  })

  it('n’est pas séquentiel — un matricule ne permet pas de deviner le suivant', () => {
    const suite = Array.from({ length: 20 }, () => Number(genererMatricule(ANNEE).slice(8, 13)))
    const ecarts = suite.slice(1).map((n, i) => n - suite[i])
    // Un compteur donnerait des écarts constants de 1.
    expect(new Set(ecarts).size).toBeGreaterThan(1)
  })

  it('ne dérive pas du cjs_uid — le connaître ne donne pas le matricule', () => {
    const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
    const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
    const src = readFileSync(resolve(__dirname, '../../src/lib/membre/matricule.ts'), 'utf-8')
    // On juge le CODE, pas la prose : la documentation a le droit d'expliquer
    // en quoi le matricule se distingue du `cjsUid`.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/cjsUid|cjs_uid/)
    // La génération ne reçoit qu'une date : elle n'a structurellement pas accès
    // à l'identité de la personne.
    expect(code).toMatch(/genererMatricule\(\s*\w+:\s*Date\s*\)/)
  })
})
