/**
 * M13 / Data Hub — synchronise les `COMMENT` MariaDB depuis la documentation `///`
 * de `prisma/schema.prisma` (lot 2, spec §7.3).
 *
 * POURQUOI CE SCRIPT DOIT ÊTRE REJOUÉ, PAS EXÉCUTÉ UNE FOIS
 * Commenter une colonne en MariaDB impose un `MODIFY COLUMN` qui redonne sa définition
 * entière. Toute migration Prisma ultérieure touchant cette colonne émet à son tour un
 * `MODIFY COLUMN` — sans clause `COMMENT` — et efface le commentaire sans erreur ni
 * warning. Les commentaires posés à la main pourrissent donc en quelques sprints.
 *
 * La source de vérité reste `schema.prisma` ; la base est une cible qu'on resynchronise.
 * À enchaîner après chaque `prisma migrate deploy`.
 *
 * Usage :
 *   npm run db:comments -- --dry-run   # affiche le SQL sans rien appliquer
 *   npm run db:comments                # applique
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local' })

import { prisma } from '../../src/lib/prisma'
import { parseSchemaDoc } from '../../src/lib/datahub/schema-doc'
import {
  buildColumnCommentSql,
  buildTableCommentSql,
  type ColumnMeta,
} from '../../src/lib/datahub/comments-sql'

interface InfoColumn {
  TABLE_NAME: string
  COLUMN_NAME: string
  COLUMN_TYPE: string
  IS_NULLABLE: string
  COLUMN_DEFAULT: string | null
  EXTRA: string
  COLUMN_COMMENT: string
}

interface InfoTable {
  TABLE_NAME: string
  TABLE_COMMENT: string
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  if (!process.env.DATABASE_URL) {
    console.error('Erreur : DATABASE_URL manquant dans l\'environnement.')
    process.exit(1)
  }

  const models = parseSchemaDoc(
    readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
  )

  // La base est seule juge de ce qui est une colonne : les relations Prisma n'en sont pas.
  const infoColumns = await prisma.$queryRaw<InfoColumn[]>`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
  `
  const infoTables = await prisma.$queryRaw<InfoTable[]>`
    SELECT TABLE_NAME, TABLE_COMMENT
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
  `

  const columnIndex = new Map<string, InfoColumn>()
  for (const c of infoColumns) columnIndex.set(`${c.TABLE_NAME}.${c.COLUMN_NAME}`, c)
  const tableIndex = new Map<string, InfoTable>()
  for (const t of infoTables) tableIndex.set(t.TABLE_NAME, t)

  const statements: string[] = []
  let documentedColumns = 0
  let orphanColumns = 0

  for (const model of models) {
    const table = tableIndex.get(model.table)
    if (!table) {
      // Modèle déclaré mais table absente : migration non appliquée sur cette base.
      console.warn(`⚠ table absente en base, ignorée : ${model.table} (modèle ${model.model})`)
      continue
    }

    if (model.doc) {
      const sql = buildTableCommentSql(model.table, table.TABLE_COMMENT, model.doc)
      if (sql) statements.push(sql)
    }

    for (const field of model.fields) {
      if (!field.doc) continue
      const info = columnIndex.get(`${model.table}.${field.column}`)
      if (!info) {
        // Champ documenté sans colonne physique : relation Prisma, ou colonne non migrée.
        orphanColumns++
        continue
      }
      documentedColumns++
      const meta: ColumnMeta = {
        table: info.TABLE_NAME,
        column: info.COLUMN_NAME,
        columnType: info.COLUMN_TYPE,
        isNullable: info.IS_NULLABLE === 'YES',
        columnDefault: info.COLUMN_DEFAULT,
        extra: info.EXTRA,
        currentComment: info.COLUMN_COMMENT,
      }
      const sql = buildColumnCommentSql(meta, field.doc)
      if (sql) statements.push(sql)
    }
  }

  console.log(
    `Documentation : ${models.filter((m) => m.doc).length}/${models.length} modèles, ` +
      `${documentedColumns} colonnes (${orphanColumns} champs documentés sans colonne physique).`
  )

  if (statements.length === 0) {
    console.log('✅ Base déjà à jour — aucun commentaire à poser.')
    await prisma.$disconnect()
    return
  }

  if (dryRun) {
    console.log(`\n-- ${statements.length} statement(s) — dry run, rien n'est appliqué\n`)
    for (const s of statements) console.log(s)
    await prisma.$disconnect()
    return
  }

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
  console.log(`✅ ${statements.length} commentaire(s) synchronisé(s).`)
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
