/**
 * M13 / Data Hub — parseur documentaire de `schema.prisma` (lot 2, spec §7).
 *
 * Les 110 commentaires `///` du schéma ne sortent aujourd'hui nulle part : Prisma 7 ne
 * les émet pas en `COMMENT` (vérifié via `migrate diff`) et les ignore dans son moteur
 * de diff. Ce parseur les rend exploitables — ils deviennent la source unique dont
 * dérivent les commentaires MariaDB, l'OpenAPI, les schémas du tap et les sources dbt.
 *
 * `@prisma/internals` n'existe plus en Prisma 7 : le parsing est fait ici, sur un
 * fichier unique et de structure régulière, plutôt que via une dépendance.
 */
import { parseSchemaDoc, parseEnums, type ModelDoc } from '@/lib/datahub/schema-doc'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function byName(models: ModelDoc[], name: string): ModelDoc {
  const m = models.find((x) => x.model === name)
  if (!m) throw new Error(`modèle absent du parse : ${name}`)
  return m
}

describe('parseSchemaDoc — extraction', () => {
  it('résout le nom physique de la table et des colonnes', () => {
    const [m] = parseSchemaDoc(`
model Utilisateur {
  cjsUid String @id @map("cjs_uid")
  nom    String
  @@map("utilisateurs")
}
`)
    expect(m.model).toBe('Utilisateur')
    expect(m.table).toBe('utilisateurs')
    expect(m.fields.map((f) => [f.field, f.column])).toEqual([
      ['cjsUid', 'cjs_uid'],
      ['nom', 'nom'],
    ])
  })

  it('retombe sur le nom du modèle quand @@map est absent', () => {
    const [m] = parseSchemaDoc('model Foo {\n  id String @id\n}\n')
    expect(m.table).toBe('Foo')
  })

  it('rattache un /// au champ qui le suit immédiatement', () => {
    const [m] = parseSchemaDoc(`
model Consultation {
  /// SHA-256 de (cjsUid ?? IP) + sel. Jamais d'IP en clair en base.
  sujetHash String @map("sujet_hash")
  origine   String?
  @@map("consultations")
}
`)
    expect(m.fields[0].doc).toBe("SHA-256 de (cjsUid ?? IP) + sel. Jamais d'IP en clair en base.")
    // Le doc ne doit pas déborder sur le champ suivant.
    expect(m.fields[1].doc).toBeNull()
  })

  it('aplatit un /// multi-ligne en une seule chaîne', () => {
    const [m] = parseSchemaDoc(`
/// Table des consultations.
/// Aucune rétention (décision PO GUIC-688).
model Consultation {
  id BigInt @id
  @@map("consultations")
}
`)
    expect(m.doc).toBe('Table des consultations. Aucune rétention (décision PO GUIC-688).')
  })

  it('ignore les commentaires // simples, qui ne sont pas documentaires', () => {
    const [m] = parseSchemaDoc(`
// Section — utilisateurs
model Foo {
  // note interne pour le développeur
  id String @id
}
`)
    expect(m.doc).toBeNull()
    expect(m.fields[0].doc).toBeNull()
  })

  it('ignore enum, generator et datasource', () => {
    const models = parseSchemaDoc(`
generator client { provider = "prisma-client-js" }
datasource db { provider = "mysql" }
/// Régions administratives
enum Region {
  Dakar
  @@map("region")
}
model Foo {
  id String @id
}
`)
    expect(models.map((m) => m.model)).toEqual(['Foo'])
  })

  it('ne prend pas les attributs de bloc @@ pour des champs', () => {
    const [m] = parseSchemaDoc(`
model Foo {
  id String @id
  @@index([id])
  @@map("foos")
}
`)
    expect(m.fields.map((f) => f.field)).toEqual(['id'])
  })
})

describe('parseSchemaDoc — sur le schéma réel du Guichet', () => {
  const source = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
  const models = parseSchemaDoc(source)

  it('retrouve tous les modèles du schéma', () => {
    const declared = (source.match(/^model \w+ \{/gm) ?? []).length
    expect(models).toHaveLength(declared)
  })

  it('résout les noms physiques des tables exportées', () => {
    expect(byName(models, 'Utilisateur').table).toBe('utilisateurs')
    expect(byName(models, 'CheckIn').table).toBe('check_ins')
    expect(byName(models, 'ProfilJeune').table).toBe('profils_jeunes')
  })

  it('capture la documentation existante des colonnes sensibles', () => {
    const sujet = byName(models, 'Consultation').fields.find((f) => f.column === 'sujet_hash')
    expect(sujet?.doc).toMatch(/HMAC-SHA256/)
  })

  it('capture les watermarks ajoutés au lot 1', () => {
    const doc = byName(models, 'Reservation').fields.find((f) => f.column === 'updated_at')?.doc
    expect(doc).toMatch(/watermark/i)
  })
})

describe('parseSchemaDoc — types déclarés', () => {
  it('sépare le type de son optionalité', () => {
    const [m] = parseSchemaDoc(`
model Foo {
  id     String    @id
  region Region?
  vues   Int       @default(0)
  tags   String[]
}
`)
    expect(m.fields.map((f) => [f.field, f.type, f.optional])).toEqual([
      ['id', 'String', false],
      ['region', 'Region', true],
      ['vues', 'Int', false],
      // Une liste n'est pas nullable au sens Prisma : le `[]` reste dans le type.
      ['tags', 'String[]', false],
    ])
  })

  it('type les colonnes réelles du schéma du Guichet', () => {
    const source = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
    const u = byName(parseSchemaDoc(source), 'Utilisateur')
    expect(u.fields.find((f) => f.field === 'updatedAt')?.type).toBe('DateTime')
    expect(u.fields.find((f) => f.field === 'deletedAt')?.optional).toBe(true)
    expect(u.fields.find((f) => f.field === 'genre')?.type).toBe('Genre')
  })
})

describe('parseEnums', () => {
  it('relève les valeurs et écarte les attributs de bloc', () => {
    const e = parseEnums(`
enum Genre {
  M
  F

  @@map("genre")
}
`)
    expect(e.Genre).toEqual(['M', 'F'])
  })

  it('écarte les commentaires en fin de valeur', () => {
    const e = parseEnums('enum V {\n  QrCard // scan de la carte\n  Manuel\n}\n')
    expect(e.V).toEqual(['QrCard', 'Manuel'])
  })

  it('relève les énumérations réelles du Guichet', () => {
    const e = parseEnums(readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8'))
    expect(e.Genre).toEqual(['M', 'F'])
    expect(e.StatutCompte).toEqual(['actif', 'inactif', 'anonymise'])
    expect(e.Region).toHaveLength(14)
    expect(e.ZoneHabitation).toEqual(['rural', 'urbain'])
  })
})
