/**
 * Migration des utilisateurs Drupal → Guichet (Prisma / MariaDB)
 * GUIC-200 — sous-tâche GUIC-17 — M13/M2
 *
 * Importe les ~22 000 jeunes Drupal historiques directement dans `utilisateurs`
 * avec un `cjs_uid` placeholder (UUID v4) + `drupal_uid` original pour permettre
 * la réconciliation SSO ultérieure (par email canonique lors de la 1re reconnexion).
 *
 * VARIABLES
 *   DRUPAL_DB_URL  = mysql://root:root@127.0.0.1:3317/drupal_db   (source)
 *   DATABASE_URL   = mysql://...                                  (cible Prisma)
 *
 * EXÉCUTION
 *   npx tsx scripts/migrate-drupal-users.ts                # DRY-RUN par défaut
 *   npx tsx scripts/migrate-drupal-users.ts --apply        # écrit réellement
 *   npx tsx scripts/migrate-drupal-users.ts --limit=100    # restreint la source
 *
 * IDEMPOTENT — relance possible sans dupliquer (skip par drupal_uid OU email).
 */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import * as mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ──────────────────────────────────────────────────────────────────

const APPLY = process.argv.includes('--apply')
const DRY_RUN = !APPLY
const LIMIT = (() => {
  const m = process.argv.find(a => a.startsWith('--limit='))
  return m ? parseInt(m.split('=')[1]) : undefined
})()
const BATCH_SIZE = (() => {
  const m = process.argv.find(a => a.startsWith('--batch='))
  return m ? parseInt(m.split('=')[1]) : 1000
})()

// Rôles Drupal à exclure de la migration (staff + recruteurs).
const EXCLUDED_ROLES = new Set(['administrator', 'admin_dashboard', 'content_editor', 'employeur'])

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrupalUserRow {
  uid: number
  mail: string | null
  status: number
  created: number
  nom: string | null
  prenom: string | null
  sexe: string | null
  telephone: string | null
  date_naissance: string | null
  roles: string | null // CSV (GROUP_CONCAT)
}

// Forme attendue par mysql2 pour les query<T>() — sans imposer constructor.name au runtime.
type DrupalUserDbRow = DrupalUserRow & RowDataPacket

export interface MigrationStats {
  total: number
  migrated: number
  skippedRole: number
  skippedNoEmail: number
  skippedEmailDup: number
  skippedPhoneDup: number
  alreadyExists: number
  errors: number
}

// ─── Helpers (exportés pour tests) ────────────────────────────────────────────

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/[\s\-().]/g, '')
  if (/^\+\d{10,15}$/.test(digits)) return digits
  if (/^\d{9}$/.test(digits)) return `+221${digits}`
  if (/^0\d{9}$/.test(digits)) return `+221${digits.slice(1)}`
  if (/^221\d{9}$/.test(digits)) return `+${digits}`
  return null
}

export function mapGenre(val: string | null | undefined): 'M' | 'F' | null {
  if (!val) return null
  const v = val.toLowerCase().trim()
  if (v === 'homme' || v === 'm' || v === 'male') return 'M'
  if (v === 'femme' || v === 'f' || v === 'female') return 'F'
  return null
}

export function parseDateNaissance(val: string | null | undefined): Date | null {
  if (!val) return null
  const d = new Date(val)
  if (isNaN(d.getTime())) return null
  const year = d.getUTCFullYear()
  if (year < 1900 || d.getTime() > Date.now()) return null
  return d
}

/**
 * Si `prenom` est vide et `nom` contient plusieurs mots (cas fréquent en source :
 * field_nom_value = "Seydou CISSE"), on tente de splitter best-effort :
 *   tout sauf le dernier token → prénom, dernier token → nom.
 * Sinon on conserve les valeurs telles quelles (avec fallback 'Inconnu' pour nom).
 */
export function splitNomPrenom(
  nom: string | null | undefined,
  prenom: string | null | undefined,
): { nom: string; prenom: string } {
  const p = (prenom ?? '').trim()
  const n = (nom ?? '').trim()
  if (p && n) return { nom: n, prenom: p }
  if (p && !n) return { nom: 'Inconnu', prenom: p }
  if (!p && n) {
    const tokens = n.split(/\s+/).filter(Boolean)
    if (tokens.length >= 2) {
      const last = tokens[tokens.length - 1]
      const first = tokens.slice(0, -1).join(' ')
      return { nom: last, prenom: first }
    }
    return { nom: n, prenom: '' }
  }
  return { nom: 'Inconnu', prenom: '' }
}

export function isExcludedByRole(rolesCsv: string | null | undefined): boolean {
  if (!rolesCsv) return false
  const roles = rolesCsv.split(',').map(r => r.trim())
  return roles.some(r => EXCLUDED_ROLES.has(r))
}

export function toCreatedAt(ts: number | null | undefined): Date {
  if (!ts || ts <= 0) return new Date()
  return new Date(ts * 1000)
}

/**
 * Transforme une ligne Drupal en payload Prisma `Utilisateur.create.data`,
 * OU retourne `{ skip: 'role'|'no_email' }` si la ligne doit être ignorée.
 */
export function buildUtilisateurPayload(row: DrupalUserRow):
  | { skip: 'role' | 'no_email' }
  | {
      data: {
        cjsUid: string
        drupalUid: number
        email: string
        telephone: string | null
        nom: string
        prenom: string
        genre: 'M' | 'F' | null
        dateNaissance: Date | null
        statut: 'actif' | 'inactif'
        onboardingComplete: false
        createdAt: Date
      }
    } {
  if (isExcludedByRole(row.roles)) return { skip: 'role' }
  const email = (row.mail ?? '').trim().toLowerCase()
  if (!email) return { skip: 'no_email' }

  const { nom, prenom } = splitNomPrenom(row.nom, row.prenom)

  return {
    data: {
      cjsUid: crypto.randomUUID(),
      drupalUid: row.uid,
      email,
      telephone: normalizePhone(row.telephone),
      nom,
      prenom,
      genre: mapGenre(row.sexe),
      dateNaissance: parseDateNaissance(row.date_naissance),
      statut: row.status === 1 ? 'actif' : 'inactif',
      onboardingComplete: false,
      createdAt: toCreatedAt(row.created),
    },
  }
}

// ─── Migration core ───────────────────────────────────────────────────────────

export async function migrateUsers(
  drupal: mysql.Connection,
  prisma: PrismaClient,
  opts: { dryRun: boolean; limit?: number; batchSize: number },
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skippedRole: 0,
    skippedNoEmail: 0,
    skippedEmailDup: 0,
    skippedPhoneDup: 0,
    alreadyExists: 0,
    errors: 0,
  }

  const limitSql = opts.limit ? `LIMIT ${opts.limit}` : ''

  const [rows] = await drupal.query<DrupalUserDbRow[]>(
    `SELECT
       u.uid,
       f.mail,
       f.status,
       f.created,
       n.field_nom_value                 AS nom,
       p.field_prenom_value              AS prenom,
       s.field_sexe_value                AS sexe,
       t.field_telephone_value           AS telephone,
       d.field_date_de_naissance_value   AS date_naissance,
       GROUP_CONCAT(DISTINCT r.roles_target_id) AS roles
     FROM users u
     JOIN users_field_data f         ON f.uid       = u.uid
     LEFT JOIN user__field_nom n     ON n.entity_id = u.uid AND n.deleted = 0 AND n.delta = 0
     LEFT JOIN user__field_prenom p  ON p.entity_id = u.uid AND p.deleted = 0 AND p.delta = 0
     LEFT JOIN user__field_sexe s    ON s.entity_id = u.uid AND s.deleted = 0 AND s.delta = 0
     LEFT JOIN user__field_telephone t ON t.entity_id = u.uid AND t.deleted = 0 AND t.delta = 0
     LEFT JOIN user__field_date_de_naissance d ON d.entity_id = u.uid AND d.deleted = 0 AND d.delta = 0
     LEFT JOIN user__roles r         ON r.entity_id = u.uid AND r.deleted = 0
     WHERE u.uid > 1
     GROUP BY u.uid
     ORDER BY u.uid ASC
     ${limitSql}`,
  )

  stats.total = rows.length
  console.log(`  Lignes Drupal récupérées : ${rows.length}`)

  // Pré-charger l'état actuel — idempotence
  const existing = await prisma.utilisateur.findMany({
    select: { drupalUid: true, email: true, telephone: true },
  })
  const existingDrupalUids = new Set<number>(
    existing.map(u => u.drupalUid).filter((x): x is number => x !== null),
  )
  const existingEmails = new Set<string>(
    existing.map(u => u.email).filter((x): x is string => !!x).map(e => e.toLowerCase()),
  )
  const existingPhones = new Set<string>(
    existing.map(u => u.telephone).filter((x): x is string => !!x),
  )

  // Trackers intra-batch pour détecter les doublons internes au flux
  const seenEmails = new Set<string>(existingEmails)
  const seenPhones = new Set<string>(existingPhones)

  let batch: Array<ReturnType<typeof buildUtilisateurPayload> extends infer T ? T : never> = []
  let processed = 0

  for (const row of rows) {
    const built = buildUtilisateurPayload(row)

    if ('skip' in built) {
      if (built.skip === 'role') stats.skippedRole++
      else stats.skippedNoEmail++
      continue
    }

    // Déjà présent
    if (existingDrupalUids.has(built.data.drupalUid)) {
      stats.alreadyExists++
      continue
    }
    if (seenEmails.has(built.data.email)) {
      stats.skippedEmailDup++
      continue
    }

    // Téléphone unique en base : si déjà pris, on déposera NULL
    if (built.data.telephone && seenPhones.has(built.data.telephone)) {
      stats.skippedPhoneDup++
      built.data.telephone = null
    }

    seenEmails.add(built.data.email)
    if (built.data.telephone) seenPhones.add(built.data.telephone)
    existingDrupalUids.add(built.data.drupalUid)

    batch.push(built)
    processed++

    if (batch.length >= opts.batchSize) {
      await flushBatch(batch, prisma, opts.dryRun, stats)
      batch = []
      console.log(`  ... ${processed}/${rows.length} traités`)
    }
  }

  if (batch.length > 0) {
    await flushBatch(batch, prisma, opts.dryRun, stats)
  }

  return stats
}

async function flushBatch(
  batch: any[],
  prisma: PrismaClient,
  dryRun: boolean,
  stats: MigrationStats,
): Promise<void> {
  if (dryRun) {
    stats.migrated += batch.length
    return
  }
  try {
    const result = await prisma.utilisateur.createMany({
      data: batch.map(b => b.data),
      skipDuplicates: true,
    })
    stats.migrated += result.count
    if (result.count < batch.length) {
      stats.alreadyExists += batch.length - result.count
    }
  } catch (err) {
    console.error(`  [ERR batch] ${(err as Error).message}`)
    // Fallback unitaire pour isoler les lignes fautives
    for (const item of batch) {
      try {
        await prisma.utilisateur.create({ data: item.data })
        stats.migrated++
      } catch (e) {
        console.error(`    drupal_uid=${item.data.drupalUid} email=${item.data.email} → ${(e as Error).message}`)
        stats.errors++
      }
    }
  }
}

// ─── Rapport ─────────────────────────────────────────────────────────────────

function printReport(stats: MigrationStats, startMs: number) {
  const duration = ((Date.now() - startMs) / 1000).toFixed(1)
  const lines = [
    '',
    '═══════════════════════════════════════════════════',
    `  MIGRATION USERS DRUPAL → GUICHET — GUIC-200`,
    `  Mode    : ${DRY_RUN ? 'DRY RUN (aucune écriture)' : 'APPLY (écriture réelle)'}`,
    `  Durée   : ${duration}s`,
    `  Limit   : ${LIMIT ?? '∞'}`,
    `  Batch   : ${BATCH_SIZE}`,
    '═══════════════════════════════════════════════════',
    `  Total lu (Drupal)        : ${stats.total}`,
    `  Migrés                   : ${stats.migrated}`,
    `  Déjà existants           : ${stats.alreadyExists}`,
    `  Skip rôle exclu          : ${stats.skippedRole}`,
    `  Skip email manquant      : ${stats.skippedNoEmail}`,
    `  Skip email dupliqué      : ${stats.skippedEmailDup}`,
    `  Téléphone NULL (dup)     : ${stats.skippedPhoneDup}`,
    `  Erreurs                  : ${stats.errors}`,
    '═══════════════════════════════════════════════════',
  ]
  const report = lines.join('\n')
  console.log(report)

  fs.mkdirSync('data', { recursive: true })
  const reportPath = path.join('data', `migration_users_${Date.now()}.txt`)
  fs.writeFileSync(reportPath, report)
  console.log(`Rapport sauvegardé : ${reportPath}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startMs = Date.now()

  if (!process.env.DRUPAL_DB_URL) throw new Error('DRUPAL_DB_URL manquant')
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant')

  console.log(`\nGuichet Jeunesse — Migration utilisateurs Drupal → Prisma`)
  console.log(`Mode  : ${DRY_RUN ? 'DRY RUN' : 'APPLY'}${LIMIT ? ` | Limit: ${LIMIT}` : ''} | Batch: ${BATCH_SIZE}`)
  console.log('─────────────────────────────────────────────────')

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
  const prisma = new PrismaClient({ adapter })
  const drupal = await mysql.createConnection(process.env.DRUPAL_DB_URL)

  let stats: MigrationStats
  try {
    stats = await migrateUsers(drupal, prisma, { dryRun: DRY_RUN, limit: LIMIT, batchSize: BATCH_SIZE })
  } finally {
    await drupal.end()
    await prisma.$disconnect()
  }
  printReport(stats, startMs)

  if (stats.errors > 0) process.exit(1)
}

// Exécution uniquement si appelé directement (pas via tests).
if (require.main === module) {
  main().catch(err => {
    console.error('Erreur fatale:', err)
    process.exit(1)
  })
}
