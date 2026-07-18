/**
 * @jest-environment node
 *
 * GUIC-562 — Sentinelle : toute table créée par une migration DOIT déclarer sa collation.
 *
 * Pourquoi ce test existe (constat live du 2026-07-14) :
 * MariaDB a changé la collation par défaut de `utf8mb4` entre les versions —
 *   MariaDB 11.8 (notre dev/CI) → utf8mb4_unicode_ci
 *   MariaDB 10.11 (prod Plesk)  → utf8mb4_general_ci
 * Une table déclarée `DEFAULT CHARSET=utf8mb4` SANS `COLLATE` hérite donc de la collation
 * par défaut du JEU DE CARACTÈRES (et non de celle de la base). Ses colonnes VARCHAR
 * prennent une collation différente des tables déjà créées en `utf8mb4_unicode_ci` →
 * toute clé étrangère vers elles est REFUSÉE (errno 150), et `prisma migrate deploy`
 * s'arrête EN PLEIN MILIEU, base à moitié migrée.
 *
 * Ce bug est invisible en CI (MariaDB 11) et fatal en production (MariaDB 10.11).
 * Cette sentinelle le rend impossible à réintroduire.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations')

/** Collation de référence, utilisée par l'ensemble du schéma. */
const COLLATION_ATTENDUE = 'utf8mb4_unicode_ci'

/** `CREATE TABLE [IF NOT EXISTS] `nom`` → capture le nom de la table. */
const RE_CREATE_TABLE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-z0-9_]+)`?/gi

interface TableDeclaree {
  migration: string
  table: string
  /** Clause finale de la déclaration (entre la dernière `)` et le `;`). */
  suffixe: string
}

function listerMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

/** Extrait chaque `CREATE TABLE` d'un fichier SQL avec la clause qui suit sa parenthèse fermante. */
function tablesCreees(migration: string): TableDeclaree[] {
  const sql = readFileSync(join(MIGRATIONS_DIR, migration, 'migration.sql'), 'utf8')
  const trouvees: TableDeclaree[] = []

  for (const m of sql.matchAll(RE_CREATE_TABLE)) {
    const table = m[1]
    // Le suffixe (ENGINE=… CHARSET=… COLLATE=…) vit entre la fin de la définition et le `;`.
    const apres = sql.slice(m.index ?? 0)
    const finInstruction = apres.indexOf(';')
    const instruction = finInstruction === -1 ? apres : apres.slice(0, finInstruction)
    const derniereParenthese = instruction.lastIndexOf(')')
    trouvees.push({
      migration,
      table,
      suffixe: derniereParenthese === -1 ? '' : instruction.slice(derniereParenthese + 1),
    })
  }
  return trouvees
}

describe('GUIC-562 — collation explicite dans les migrations', () => {
  const migrations = listerMigrations()

  it('trouve bien les migrations sur le disque', () => {
    expect(migrations.length).toBeGreaterThan(0)
  })

  it('déclare une collation explicite sur CHAQUE table créée', () => {
    const fautives = migrations
      .flatMap(tablesCreees)
      .filter((t) => !new RegExp(`COLLATE\\s*=?\\s*${COLLATION_ATTENDUE}`, 'i').test(t.suffixe))
      .map((t) => `${t.migration} → table \`${t.table}\` (suffixe : "${t.suffixe.trim()}")`)

    // Message explicite : sans collation, la clé étrangère casse en MariaDB 10.11 (prod).
    expect(fautives).toEqual([])
  })

  it("n'utilise jamais une collation autre que celle du schéma", () => {
    const divergentes = migrations
      .flatMap(tablesCreees)
      .filter((t) => /COLLATE\s*=?\s*(\w+)/i.test(t.suffixe))
      .filter((t) => {
        const collation = /COLLATE\s*=?\s*(\w+)/i.exec(t.suffixe)?.[1]
        return collation !== COLLATION_ATTENDUE
      })
      .map((t) => `${t.migration} → \`${t.table}\``)

    expect(divergentes).toEqual([])
  })
})
