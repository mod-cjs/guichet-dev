/**
 * Backfill téléphones SSO depuis Drupal — GUIC-17
 *
 * Lecture sur Drupal · Écriture via PATCH /users/{uuid} (mode only_if_null + silent)
 *
 * Aucun téléphone existant n'est écrasé. Aucun webhook n'est dispatché côté SSO
 * (silent=true) pour éviter de saturer les plateformes abonnées.
 *
 * PRÉREQUIS
 * ---------
 *   DRUPAL_DB_URL    = mysql://user:pass@host:3306/drupal_db
 *   SSO_BASE_URL     = https://sso.cjs.sn
 *   SSO_API_KEY      = clé API server-to-server
 *   SSO_API_SECRET   = secret HMAC
 *   SSO_ADMIN_TOKEN  = Bearer token Passport scope admin
 *   CJS_UID_MAP_FILE = ./data/drupal_uid_cjs_uid_map.json
 *
 * EXÉCUTION
 * ---------
 *   npx tsx scripts/backfill-sso-phones.ts [--dry-run] [--concurrency=5]
 */

import * as mysql           from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import * as fs               from 'fs'
import * as path             from 'path'

import { SSOApiClient } from '../src/lib/migration/sso-api-client'

const DRY_RUN       = process.argv.includes('--dry-run')
const DRUPAL_DB_URL = process.env.DRUPAL_DB_URL
const MAP_FILE      = process.env.CJS_UID_MAP_FILE ?? './data/drupal_uid_cjs_uid_map.json'
const CONCURRENCY   = (() => {
  const m = process.argv.find(a => a.startsWith('--concurrency='))
  return m ? Math.max(1, parseInt(m.split('=')[1])) : 5
})()

interface DrupalPhone extends RowDataPacket {
  uid:       number
  telephone: string | null
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/[\s\-().]/g, '')
  if (/^\+\d{10,15}$/.test(digits))  return digits
  if (/^\d{9}$/.test(digits))        return `+221${digits}`
  if (/^0\d{9}$/.test(digits))       return `+221${digits.slice(1)}`
  if (/^221\d{9}$/.test(digits))     return `+${digits}`
  return null
}

async function main() {
  if (!DRUPAL_DB_URL) throw new Error('DRUPAL_DB_URL manquant')
  if (!fs.existsSync(MAP_FILE)) throw new Error(`Mapping introuvable : ${MAP_FILE}`)

  const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf-8')) as Record<string, string>

  const client = DRY_RUN ? null : new SSOApiClient({
    baseUrl:    requireEnv('SSO_BASE_URL'),
    apiKey:     requireEnv('SSO_API_KEY'),
    apiSecret:  requireEnv('SSO_API_SECRET'),
    adminToken: requireEnv('SSO_ADMIN_TOKEN'),
  })

  console.log('\nBackfill téléphones SSO via API — GUIC-17')
  console.log(`Mode        : ${DRY_RUN ? 'DRY RUN (aucun appel API)' : 'RÉEL (PATCH /users/{uuid})'}`)
  console.log(`Concurrency : ${CONCURRENCY}`)
  console.log('─────────────────────────────────────────────────────')

  const drupal = await mysql.createConnection(DRUPAL_DB_URL)
  const [rows] = await drupal.query<DrupalPhone[]>(
    `SELECT u.uid, t.field_telephone_value AS telephone
       FROM users u
       JOIN users_field_data f ON f.uid = u.uid AND f.status = 1
       LEFT JOIN user__field_telephone t ON t.entity_id = u.uid AND t.deleted = 0
      WHERE u.uid > 0 AND t.field_telephone_value IS NOT NULL`,
  )
  await drupal.end()
  console.log(`Téléphones Drupal détectés : ${rows.length}`)

  // Préparer la liste de PATCH à exécuter
  type Job = { drupalUid: number; uuid: string; phone: string }
  const jobs: Job[] = []
  let skippedNoMap = 0
  let skippedBadFormat = 0
  for (const row of rows) {
    const phone = normalizePhone(row.telephone)
    if (!phone) { skippedBadFormat++; continue }
    const uuid = map[String(row.uid)]
    if (!uuid)  { skippedNoMap++; continue }
    jobs.push({ drupalUid: row.uid, uuid, phone })
  }

  console.log(`À appliquer        : ${jobs.length}`)
  console.log(`Ignorés (format)   : ${skippedBadFormat}`)
  console.log(`Ignorés (non-mappé): ${skippedNoMap}`)

  if (DRY_RUN || jobs.length === 0) {
    if (DRY_RUN && jobs[0]) console.log('\nDRY RUN — premier PATCH simulé :', jobs[0])
    return
  }

  // Exécuter avec parallélisme borné
  const results = { ok: 0, notFound: 0, errors: [] as Array<{ uuid: string; error: string }> }
  const t0 = Date.now()

  await runWithConcurrency(jobs, CONCURRENCY, async job => {
    try {
      const res = await client!.updateUser(
        job.uuid,
        { phone: job.phone },
        { onlyIfNull: true, silent: true },
      )
      if (res === null) results.notFound++
      else              results.ok++
    } catch (e) {
      results.errors.push({ uuid: job.uuid, error: (e as Error).message })
    }
  })

  const dt = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\nTerminé (${dt}s) :`)
  console.log(`  Mis à jour    : ${results.ok}`)
  console.log(`  Introuvables  : ${results.notFound}`)
  console.log(`  Erreurs       : ${results.errors.length}`)

  fs.mkdirSync('data', { recursive: true })
  const reportPath = path.join('data', `backfill_phones_report_${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary:   { jobs: jobs.length, ...results, duration_seconds: dt, errors_count: results.errors.length },
    errors:    results.errors.slice(0, 100),
  }, null, 2), 'utf-8')
  console.log(`  Rapport       : ${reportPath}`)

  if (results.errors.length > 0) process.exitCode = 1
}

async function runWithConcurrency<T>(
  items: T[], concurrency: number, worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = items.slice()
  const runners = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (item) await worker(item)
    }
  })
  await Promise.all(runners)
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Variable d'environnement ${name} manquante`)
  return v
}

main().catch(err => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})
