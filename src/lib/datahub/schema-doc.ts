/**
 * M13 / Data Hub — parseur documentaire de `prisma/schema.prisma` (spec §7).
 *
 * POURQUOI CE PARSEUR EXISTE
 * Les commentaires `///` du schéma sont la seule documentation des colonnes du Guichet,
 * et ils ne sortent nulle part : Prisma 7.8 ne les traduit pas en `COMMENT` SQL (vérifié
 * par `migrate diff` : la DDL générée n'en porte aucune trace) et son moteur de diff les
 * ignore entièrement. `@prisma/internals`, qui exposait le DMMF, n'est plus installé en
 * Prisma 7 — d'où ce parseur dédié plutôt qu'une dépendance.
 *
 * Il rend les `///` exploitables : ils deviennent la source unique dont dérivent les
 * commentaires MariaDB, les descriptions OpenAPI, les schémas du tap Singer et les
 * sources dbt. Une seule prose, jamais dupliquée.
 *
 * PORTÉE — le parseur restitue TOUS les champs déclarés, y compris les relations, qui
 * n'ont pas de colonne physique. Le tri revient au consommateur, qui croise avec
 * `information_schema` : la base est seule juge de ce qui est réellement une colonne.
 */

export interface FieldDoc {
  /** Nom du champ tel que déclaré dans le schéma Prisma. */
  field: string
  /** Nom physique de la colonne — `@map(...)` s'il existe, sinon le nom du champ. */
  column: string
  /** Type Prisma déclaré, sans le `?` d'optionalité (`String`, `DateTime`, `Region`…). */
  type: string
  /** Le champ accepte `null`. */
  optional: boolean
  /** Documentation `///` aplatie sur une ligne, `null` si absente. */
  doc: string | null
}

export interface ModelDoc {
  model: string
  /** Nom physique de la table — `@@map(...)` s'il existe, sinon le nom du modèle. */
  table: string
  doc: string | null
  fields: FieldDoc[]
}

/** Blocs de premier niveau qui ne décrivent pas de table et sont traversés sans être lus. */
const IGNORED_BLOCK = /^(enum|generator|datasource|view|type)\s+\w+\s*\{/

const MODEL_OPEN = /^model\s+(\w+)\s*\{/
const MAP_ATTR = /@map\("([^"]+)"\)/
const BLOCK_MAP_ATTR = /@@map\("([^"]+)"\)/
/** Un champ commence par un identifiant suivi d'un type — écarte `@@index`, `}`, etc. */
const FIELD_LINE = /^(\w+)\s+(\S+)/

/** Aplatit un bloc `///` multi-ligne en une chaîne unique, ou `null` s'il est vide. */
function flatten(lines: string[]): string | null {
  const text = lines.map((l) => l.trim()).filter(Boolean).join(' ').trim()
  return text.length > 0 ? text : null
}

/**
 * Valeurs de chaque énumération du schéma, par nom.
 *
 * Un contrat de données qui annonce `statut: string` sans dire lesquels oblige l'analyste
 * à deviner ou à interroger la base. Les valeurs font partie de la documentation.
 */
export function parseEnums(source: string): Record<string, string[]> {
  const enums: Record<string, string[]> = {}
  for (const match of source.matchAll(/^enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    enums[match[1]] = match[2]
      .split('\n')
      .map((l) => l.trim())
      // Une valeur d'enum est un identifiant nu : écarte `@@map`, `///`, `//` et le vide.
      .map((l) => /^(\w+)(\s*\/\/.*)?$/.exec(l)?.[1])
      .filter((v): v is string => v !== undefined)
  }
  return enums
}

export function parseSchemaDoc(source: string): ModelDoc[] {
  const models: ModelDoc[] = []
  let pending: string[] = []
  let current: ModelDoc | null = null
  let skipDepth = 0

  for (const raw of source.split('\n')) {
    const line = raw.trim()

    // Traversée d'un bloc ignoré (enum, generator…) jusqu'à sa fermeture.
    if (skipDepth > 0) {
      if (line === '}') skipDepth = 0
      continue
    }

    if (line.startsWith('///')) {
      pending.push(line.slice(3))
      continue
    }
    // Commentaire non documentaire : sans valeur ici, et sans effet sur le `///` en cours.
    if (line.startsWith('//')) continue

    if (line === '') {
      // Un bloc `///` séparé de sa cible par une ligne vide ne lui appartient plus.
      pending = []
      continue
    }

    if (current === null) {
      const model = MODEL_OPEN.exec(line)
      if (model) {
        current = { model: model[1], table: model[1], doc: flatten(pending), fields: [] }
        pending = []
        continue
      }
      // Bloc ignoré. Refermé sur la même ligne (`generator db { x = "y" }`), il ne doit
      // PAS ouvrir un saut — sinon tout ce qui suit est avalé jusqu'au prochain `}`.
      if (IGNORED_BLOCK.test(line) && !line.endsWith('}')) skipDepth = 1
      pending = []
      continue
    }

    if (line === '}') {
      models.push(current)
      current = null
      pending = []
      continue
    }

    if (line.startsWith('@@')) {
      const table = BLOCK_MAP_ATTR.exec(line)
      if (table) current.table = table[1]
      pending = []
      continue
    }

    const field = FIELD_LINE.exec(line)
    if (field) {
      const declared = field[2]
      current.fields.push({
        field: field[1],
        column: MAP_ATTR.exec(line)?.[1] ?? field[1],
        // `String?` → type `String`, optionnel. `String[]` reste tel quel : une liste
        // n'est pas nullable au sens Prisma.
        type: declared.replace(/[?]$/, ''),
        optional: declared.endsWith('?'),
        doc: flatten(pending),
      })
    }
    pending = []
  }

  return models
}
