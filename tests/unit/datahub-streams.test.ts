/**
 * M13 / Data Hub — garde-fous du contrat d'export (lot 3, spec §10.1).
 *
 * Le contrat de `streams.ts` est déjà vérifié par `tsc` : une colonne inexistante, une
 * transformation mal typée ou un watermark qui n'est pas une date ne compilent pas
 * (vérifié en conditions réelles, les trois cas produisent bien une erreur).
 *
 * Ces tests couvrent ce que le typage ne peut pas voir :
 *   - qu'aucune colonne interdite ne soit exportée, quelle que soit l'inattention ;
 *   - que toute colonne exportée porte une documentation — c'est ce qui transforme
 *     « il faudrait documenter » en « on ne peut pas exporter sans documenter ».
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { streams } from '@/lib/datahub/streams'
import { CHAMPS_INTERDITS, CHAMPS_DERIVABLES, estListe } from '@/lib/datahub/stream-types'
import { parseSchemaDoc } from '@/lib/datahub/schema-doc'

const entries = Object.entries(streams)
const models = parseSchemaDoc(
  readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
)

/** Toutes les colonnes exportées, à plat : (flux, modèle, champ Prisma, spec). */
const exported = entries.flatMap(([stream, def]) =>
  Object.entries(
    def.fields as Record<
      string,
      { as: string; tier: string; transform?: unknown; outputType?: string; description?: string }
    >
  )
    .map(([field, spec]) => ({ stream, model: def.model, field, spec }))
)

describe('contrat d\'export — confidentialité', () => {
  it('exporte au moins une colonne par flux', () => {
    for (const [stream, def] of entries) {
      expect(Object.keys(def.fields).length).toBeGreaterThan(0)
      expect(stream).toMatch(/^[a-z][a-z0-9_]*$/)
    }
  })

  it('n\'exporte aucune colonne interdite', () => {
    const fautes = exported
      .filter((e) => estListe(CHAMPS_INTERDITS, e.model, e.field))
      .map((e) => `${e.stream}.${e.field}`)
    expect(fautes).toEqual([])
  })

  it('n\'exporte une colonne dérivable que transformée, jamais brute', () => {
    const brutes = exported
      .filter((e) => estListe(CHAMPS_DERIVABLES, e.model, e.field))
      .filter((e) => e.spec.transform === undefined)
      .map((e) => `${e.stream}.${e.field}`)
    expect(brutes).toEqual([])
  })

  it('déclare le type de sortie de toute colonne transformée', () => {
    // Sans lui, le contrat publié annoncerait le type de la colonne SOURCE :
    // `tranche_age` serait décrit comme une date. Le consommateur serait trompé.
    const sansType = exported
      .filter((e) => e.spec.transform !== undefined && e.spec.outputType === undefined)
      .map((e) => `${e.stream}.${e.field}`)
    expect(sansType).toEqual([])
  })

  it('décrit la sortie de toute colonne transformée, et non sa source', () => {
    // Sans description propre, le contrat publié reprend le /// de la colonne source :
    // `tranche_age` s'y retrouve décrite comme « la date de naissance déclarée ».
    const sansDescription = exported
      .filter((e) => e.spec.transform !== undefined && !e.spec.description)
      .map((e) => `${e.stream}.${e.field}`)
    expect(sansDescription).toEqual([])
  })

  it('renomme la colonne dérivée pour que le nom ne trahisse pas la source', () => {
    for (const e of exported.filter((x) => estListe(CHAMPS_DERIVABLES, x.model, x.field))) {
      expect(e.spec.as).not.toBe(e.field)
    }
  })

  it('classe le cjs_uid et les clés de jointure en pseudonyme, jamais en public', () => {
    const malClasses = exported
      .filter((e) => /^(cjsUid|.*Id|id)$/.test(e.field) && e.spec.tier !== 'pseudonyme')
      .map((e) => `${e.stream}.${e.field}`)
    expect(malClasses).toEqual([])
  })
})

describe('contrat d\'export — cohérence', () => {
  it('déclare une clé primaire et un watermark pour chaque flux', () => {
    for (const [stream, def] of entries) {
      expect(def.primaryKey).toBeTruthy()
      expect(def.replicationKey).toBeTruthy()
      expect(`${stream}:${def.model}`).toBeTruthy()
    }
  })

  it('exporte toujours la clé primaire et le watermark — sans quoi le tap ne peut pas paginer', () => {
    for (const [stream, def] of entries) {
      const champs = Object.keys(def.fields)
      expect(champs).toContain(def.primaryKey)
      expect(champs).toContain(def.replicationKey)
      expect(stream).toBeTruthy()
    }
  })

  it('nomme les colonnes de l\'entrepôt en snake_case, sans collision dans un flux', () => {
    for (const [stream, def] of entries) {
      const noms = Object.values(
        def.fields as Record<string, { as: string }>
      ).map((f) => f.as)
      for (const nom of noms) expect(nom).toMatch(/^[a-z][a-z0-9_]*$/)
      expect(new Set(noms).size).toBe(noms.length)
      expect(stream).toBeTruthy()
    }
  })

  it('ne déclare pas deux flux sur le même modèle', () => {
    const modeles = entries.map(([, def]) => def.model)
    expect(new Set(modeles).size).toBe(modeles.length)
  })
})

describe('contrat d\'export — dictionnaire opposable', () => {
  it('documente dans schema.prisma toute colonne exportée', () => {
    const nonDocumentees: string[] = []

    for (const { stream, model, field } of exported) {
      const m = models.find((x) => x.model === model)
      if (!m) throw new Error(`modèle absent de schema.prisma : ${model}`)
      const f = m.fields.find((x) => x.field === field)
      if (!f) throw new Error(`champ absent de schema.prisma : ${model}.${field}`)
      if (f.doc === null) nonDocumentees.push(`${stream}.${field}`)
    }

    expect(nonDocumentees).toEqual([])
  })

  it('documente le modèle de chaque flux exporté', () => {
    const nonDocumentes = entries
      .filter(([, def]) => models.find((m) => m.model === def.model)?.doc == null)
      .map(([stream]) => stream)
    expect(nonDocumentes).toEqual([])
  })
})

describe('contrat d\'export — nature des clés primaires', () => {
  it('déclare bigint exactement là où le schéma en porte un', () => {
    const attendu: string[] = []
    const declare: string[] = []

    for (const [stream, def] of entries) {
      const type = models
        .find((m) => m.model === def.model)
        ?.fields.find((f) => f.field === def.primaryKey)?.type
      if (type === 'BigInt') attendu.push(stream)
      if ((def as { primaryKeyKind?: string }).primaryKeyKind === 'bigint') declare.push(stream)
    }

    // Une déclaration manquante fait échouer l'extraction à l'exécution : Prisma refuse
    // une chaîne là où il attend un BigInt. Une déclaration en trop la fait échouer aussi.
    expect(declare.sort()).toEqual(attendu.sort())
    expect(attendu).toContain('consultations')
  })
})
