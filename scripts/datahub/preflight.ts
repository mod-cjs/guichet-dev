/**
 * M13 / Data Hub — contrôle de pré-vol avant la première extraction.
 *
 * POURQUOI UN SCRIPT ET NON UN TEST
 * Ces contrôles portent sur les DONNÉES et le déploiement de la base cible, pas sur le
 * code. Un test rouge en CI pour une date invalide en production ne serait pas actionnable
 * par le développeur qui le déclenche — il ne peut rien y faire depuis sa branche. C'est
 * une étape de mise en service, à passer avant d'ouvrir le robinet vers l'entrepôt.
 *
 * Les trois premiers contrôles viennent de défauts RÉELLEMENT rencontrés sur la base POC,
 * pas d'une liste de précautions théoriques.
 *
 * Usage : npm run datahub:preflight
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local' })

import { prisma } from '../../src/lib/prisma'
import { allDescriptors } from '../../src/lib/datahub/descriptor'
import { parseSchemaDoc } from '../../src/lib/datahub/schema-doc'
import { colonnesDateExportees } from '../../src/lib/datahub/date-columns'
import { sqlModeSuffisant } from '../../src/lib/datahub/sql-mode'

interface Constat {
  ok: boolean
  libelle: string
  detail: string
}

const constats: Constat[] = []
function noter(ok: boolean, libelle: string, detail = '') {
  constats.push({ ok, libelle, detail })
}

async function main(): Promise<void> {
  const models = parseSchemaDoc(readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8'))
  const descriptors = allDescriptors()

  // ── 1. Dates invalides — TOUTES les colonnes date exportées, pas les seules clés
  //      de réplication ────────────────────────────────────────────────────────
  // `0000-00-00` est accepté par MariaDB sous certains sql_mode mais ILLISIBLE par le
  // driver Prisma : « Invalid time value » est levé avant tout code applicatif, et le
  // flux entier devient inexploitable.
  //
  // GUIC-696 R1 — se limiter à la clé de réplication laissait un pré-vol vert sur une
  // base où une AUTRE colonne date exportée (ex. `candidatures.soumise_a`,
  // `utilisateurs.date_naissance`) porte une date à zéro : l'extraction meurt en plein
  // run, à la page où cette ligne tombe dans le tri, sans que rien ne l'ait annoncé.
  for (const c of colonnesDateExportees(descriptors, models)) {
    const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*) AS n FROM \`${c.table}\` WHERE CAST(\`${c.column}\` AS CHAR) LIKE '0000%'`
    )
    noter(
      Number(n) === 0,
      `${c.stream} — ${c.column} valide`,
      Number(n) > 0 ? `${n} ligne(s) à 0000-00-00` : ''
    )
  }

  // ── 2. Rattachements orphelins ────────────────────────────────────────────────
  // Les FK peuvent exister sans avoir joué : un dump chargé avec FOREIGN_KEY_CHECKS=0
  // laisse des liens vers des entités disparues. Le code est gardé, mais un lien mort
  // reste une donnée fausse qui fausserait les agrégats de l'entrepôt.
  const jonctions: Array<[string, string, string, string]> = [
    ['opportunites_tags', 'tag_id', 'tags', 'tags'],
    ['opportunites_skills', 'skill_id', 'skills', 'compétences'],
    ['opportunites_programmes', 'programme_id', 'programmes', 'programmes'],
  ]
  for (const [table, fk, cible, libelle] of jonctions) {
    const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*) AS n FROM \`${table}\` j LEFT JOIN \`${cible}\` c ON c.id = j.\`${fk}\` WHERE c.id IS NULL`
    )
    noter(Number(n) === 0, `rattachements ${libelle} intègres`, Number(n) > 0 ? `${n} lien(s) orphelin(s)` : '')
  }

  // ── 3. Index de réplication ───────────────────────────────────────────────────
  // Sans eux chaque page d'extraction déclenche un tri complet de la table : invisible
  // sur les petites, fatal sur les grosses.
  for (const d of descriptors) {
    const model = models.find((m) => m.model === d.model)
    if (!model) continue
    const wm = model.fields.find((f) => f.field === d.replicationKey)?.column
    const pk = model.fields.find((f) => f.field === d.primaryKey)?.column
    if (!wm || !pk) continue

    const lignes = await prisma.$queryRawUnsafe<{ INDEX_NAME: string; SEQ_IN_INDEX: number; COLUMN_NAME: string }[]>(
      `SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${model.table}'`
    )
    const premiers = new Set(lignes.filter((l) => Number(l.SEQ_IN_INDEX) === 1 && l.COLUMN_NAME === wm).map((l) => l.INDEX_NAME))
    const seconds = new Set(lignes.filter((l) => Number(l.SEQ_IN_INDEX) === 2 && l.COLUMN_NAME === pk).map((l) => l.INDEX_NAME))
    const composite = [...premiers].some((i) => seconds.has(i))
    noter(composite, `${d.name} — index (${wm}, ${pk})`, composite ? '' : 'absent : chaque page fera un tri complet')
  }

  // ── 4. Clé d'accès configurée ─────────────────────────────────────────────────
  // Une variable absente REFUSE tout accès (GUIC-631) : le pipeline échouerait en 401
  // sans que la cause soit évidente côté tap.
  const cles = (process.env.DATAHUB_API_KEYS ?? process.env.DATAHUB_API_KEY ?? '').trim()
  noter(cles.length > 0, 'clé Data Hub configurée', cles ? '' : 'DATAHUB_API_KEYS et DATAHUB_API_KEY vides → tout accès refusé')

  // ── 5. sql_mode serveur — la prévention, pas seulement la détection (GUIC-696 R4) ──
  // `docker-compose.yml` pose NO_ZERO_DATE/NO_ZERO_IN_DATE en développement, mais ce
  // fichier ne pilote pas la MariaDB Plesk de préprod/prod : sans ce contrôle, le trou
  // reste invisible jusqu'à ce qu'une date zéro traverse en production.
  const [{ mode }] = await prisma.$queryRawUnsafe<{ mode: string }[]>('SELECT @@sql_mode AS mode')
  noter(
    sqlModeSuffisant(mode),
    'sql_mode serveur — NO_ZERO_DATE et NO_ZERO_IN_DATE',
    sqlModeSuffisant(mode) ? '' : `sql_mode actuel : ${mode}`
  )

  // ── 6. État Meltano externalisé (GUIC-696 R5) ─────────────────────────────────
  // Sans MELTANO_DATABASE_URI, l'état vit dans le SQLite d'un conteneur --rm : chaque nuit
  // repart de zéro, sans erreur, avec un full-refresh de plus en plus long — une
  // dégradation silencieuse, pas une panne qui s'annonce.
  noter(
    Boolean(process.env.MELTANO_DATABASE_URI?.trim()),
    'MELTANO_DATABASE_URI configurée',
    process.env.MELTANO_DATABASE_URI?.trim()
      ? ''
      : 'absente → état Meltano perdu à chaque conteneur, full-refresh chaque nuit'
  )

  // ── Rapport ───────────────────────────────────────────────────────────────────
  const echecs = constats.filter((c) => !c.ok)
  for (const c of constats) {
    console.log(`${c.ok ? '✅' : '❌'} ${c.libelle}${c.detail ? ` — ${c.detail}` : ''}`)
  }
  console.log(`\n${constats.length - echecs.length}/${constats.length} contrôles passés.`)

  await prisma.$disconnect()
  if (echecs.length > 0) {
    console.error(`\n⛔ ${echecs.length} contrôle(s) en échec — ne pas lancer d'extraction en l'état.`)
    process.exit(1)
  }
  console.log('\n✅ Base prête pour l\'extraction.')
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
