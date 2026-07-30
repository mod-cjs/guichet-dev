/**
 * @jest-environment node
 *
 * M13 / Data Hub — prérequis de schéma pour l'extraction incrémentale (lot 1 de
 * `.agent_context/specs/M13-etl-meltano.md` §4).
 *
 * Deux invariants, par flux exporté :
 *
 *  1. **Un watermark existe.** Sans colonne de réplication, le tap ne sait pas ce qui a
 *     changé depuis son dernier passage et doit tout relire à chaque run.
 *  2. **Un index composite `(watermark, clé primaire)` existe.** L'extraction trie sur
 *     `ORDER BY watermark ASC, pk ASC` — le tri total est ce qui rend la pagination par
 *     curseur correcte sous écriture concurrente. Sans cet index, chaque page déclenche
 *     un filesort sur la table entière : les mesures de débit deviennent sans valeur et
 *     `consultations` s'effondre en production.
 *
 * L'introspection passe par `information_schema` : c'est une propriété du schéma physique,
 * hors de portée de l'API typée Prisma. Exception assumée à la règle « toujours Prisma »,
 * limitée à un test de structure — aucune donnée applicative n'est lue.
 */
import { prisma } from '@/lib/prisma'

/** Les 13 flux de la spec §5 : table physique, clé de réplication, clé primaire. */
const STREAMS: ReadonlyArray<{ stream: string; table: string; watermark: string; pk: string }> = [
  { stream: 'utilisateurs', table: 'utilisateurs', watermark: 'updated_at', pk: 'cjs_uid' },
  { stream: 'profils_jeunes', table: 'profils_jeunes', watermark: 'updated_at', pk: 'id' },
  { stream: 'opportunites', table: 'opportunites', watermark: 'updated_at', pk: 'id' },
  { stream: 'candidatures', table: 'candidatures', watermark: 'updated_at', pk: 'id' },
  { stream: 'evenements', table: 'evenements', watermark: 'updated_at', pk: 'id' },
  { stream: 'inscriptions_evenements', table: 'inscriptions_evenements', watermark: 'updated_at', pk: 'id' },
  { stream: 'centres', table: 'centres', watermark: 'updated_at', pk: 'id' },
  { stream: 'reservations', table: 'reservations', watermark: 'updated_at', pk: 'id' },
  { stream: 'checkins', table: 'check_ins', watermark: 'effectue_a', pk: 'id' },
  { stream: 'ressources', table: 'ressources', watermark: 'updated_at', pk: 'id' },
  { stream: 'consultations', table: 'consultations', watermark: 'created_at', pk: 'id' },
  { stream: 'emprunts', table: 'emprunts', watermark: 'updated_at', pk: 'id' },
  { stream: 'programmes', table: 'programmes', watermark: 'updated_at', pk: 'id' },
]

interface ColumnRow {
  TABLE_NAME: string
  COLUMN_NAME: string
}
interface IndexRow {
  TABLE_NAME: string
  INDEX_NAME: string
  SEQ_IN_INDEX: number | bigint
  COLUMN_NAME: string
}

let columns: ColumnRow[] = []
let indexes: IndexRow[] = []

beforeAll(async () => {
  columns = await prisma.$queryRaw<ColumnRow[]>`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
  `
  indexes = await prisma.$queryRaw<IndexRow[]>`
    SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
  `
})

afterAll(async () => {
  await prisma.$disconnect()
})

/** Nom de l'index dont la colonne en position `seq` est `column`, pour `table`. */
function indexNamesAt(table: string, seq: number, column: string): Set<string> {
  return new Set(
    indexes
      .filter(
        (i) =>
          i.TABLE_NAME === table &&
          Number(i.SEQ_IN_INDEX) === seq &&
          i.COLUMN_NAME === column
      )
      .map((i) => i.INDEX_NAME)
  )
}

describe.each(STREAMS)(
  'Data Hub — prérequis d\'extraction du flux $stream',
  ({ table, watermark, pk }) => {
    it(`la table \`${table}\` porte le watermark \`${watermark}\``, () => {
      const found = columns.some(
        (c) => c.TABLE_NAME === table && c.COLUMN_NAME === watermark
      )
      expect(found).toBe(true)
    })

    it(`un index composite \`(${watermark}, ${pk})\` couvre le tri de réplication`, () => {
      const first = indexNamesAt(table, 1, watermark)
      const second = indexNamesAt(table, 2, pk)
      const composite = [...first].filter((name) => second.has(name))
      expect(composite.length).toBeGreaterThan(0)
    })
  }
)
