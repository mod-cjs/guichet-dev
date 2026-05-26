/**
 * Création des comptes SSO pour utilisateurs Drupal non-mappés (GUIC-17 — M1)
 *
 * Lecture sur la base Drupal · Écriture via API SSO (POST /users/provision/bulk)
 *
 * PRÉREQUIS
 * ---------
 *   DRUPAL_DB_URL       = mysql://user:pass@host:3306/drupal_db   (lecture seule)
 *   SSO_BASE_URL        = https://sso.cjs.sn
 *   SSO_API_KEY         = clé API server-to-server
 *   SSO_API_SECRET      = secret HMAC
 *   SSO_ADMIN_TOKEN     = Bearer token Passport scope admin (généré côté SSO admin)
 *   CJS_UID_MAP_FILE    = ./data/drupal_uid_cjs_uid_map.json (défaut)
 *   IMPORT_BATCH        = identifiant batch (défaut : UUID auto)
 *
 * EXÉCUTION
 * ---------
 *   npx tsx scripts/create-sso-accounts.ts [--dry-run] [--limit=N]
 *
 * SORTIES
 * -------
 *   data/drupal_uid_cjs_uid_map.json (mis à jour incrémentalement)
 *   data/create_sso_accounts_report_<batch>.json (rapport détaillé)
 */

import * as mysql           from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import * as fs               from 'fs'
import * as path             from 'path'
import * as crypto           from 'crypto'

import { SSOApiClient, type BulkUser, type BulkResult } from '../src/lib/migration/sso-api-client'

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN       = process.argv.includes('--dry-run')
const LIMIT         = (() => { const m = process.argv.find(a => a.startsWith('--limit=')); return m ? parseInt(m.split('=')[1]) : undefined })()
const DRUPAL_DB_URL = process.env.DRUPAL_DB_URL
const MAP_FILE      = process.env.CJS_UID_MAP_FILE ?? './data/drupal_uid_cjs_uid_map.json'
const IMPORT_BATCH  = process.env.IMPORT_BATCH ?? crypto.randomUUID()

// ─── Types Drupal ────────────────────────────────────────────────────────────

interface DrupalUser extends RowDataPacket {
  uid:            number
  mail:           string
  created:        number
  nom:            string | null
  prenom:         string | null
  sexe:           string | null
  telephone:      string | null
  date_naissance: string | null
  region:         string | null
  commune:        string | null
}

// ─── Helpers de mapping ──────────────────────────────────────────────────────

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/[\s\-().]/g, '')
  if (/^\+\d{10,15}$/.test(digits)) return digits
  if (/^\d{9}$/.test(digits))       return `+221${digits}`
  if (/^0\d{9}$/.test(digits))      return `+221${digits.slice(1)}`
  if (/^221\d{9}$/.test(digits))    return `+${digits}`
  return null
}

function mapGender(val: string | null): 'M' | 'F' | null {
  if (!val) return null
  const v = val.toLowerCase()
  if (v === 'homme' || v === 'm' || v === 'male')   return 'M'
  if (v === 'femme' || v === 'f' || v === 'female') return 'F'
  return null
}

// Le SSO exige first_name / last_name non vides. Certains comptes Drupal n'ont
// ni nom ni prénom → on retombe sur la partie locale de l'email, puis un défaut.
function deriveNames(prenom: string | null, nom: string | null, email: string): {
  first: string
  last:  string
} {
  const local = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim()
  const p = prenom?.trim()
  const n = nom?.trim()
  return {
    first: p || local || 'Jeune',
    last:  n || local || 'Migration',
  }
}

function mapRegion(val: string | null): string | null {
  if (!val) return null
  const map: Record<string, string> = {
    'dakar': 'Dakar', 'thiès': 'Thies', 'thies': 'Thies', 'diourbel': 'Diourbel',
    'fatick': 'Fatick', 'kaolack': 'Kaolack', 'kaffrine': 'Kaffrine',
    'louga': 'Louga', 'saint-louis': 'Saint-Louis', 'saint_louis': 'Saint-Louis',
    'matam': 'Matam', 'tambacounda': 'Tambacounda', 'kédougou': 'Kédougou',
    'kedougou': 'Kédougou', 'kolda': 'Kolda', 'ziguinchor': 'Ziguinchor',
    'sédhiou': 'Sédhiou', 'sedhiou': 'Sédhiou',
  }
  return map[val.toLowerCase()] ?? val
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!DRUPAL_DB_URL) throw new Error('DRUPAL_DB_URL manquant')

  const client = DRY_RUN ? null : new SSOApiClient({
    baseUrl:    requireEnv('SSO_BASE_URL'),
    apiKey:     requireEnv('SSO_API_KEY'),
    apiSecret:  requireEnv('SSO_API_SECRET'),
    adminToken: requireEnv('SSO_ADMIN_TOKEN'),
  })

  console.log('\nCréation comptes SSO via API — GUIC-17')
  console.log(`Mode         : ${DRY_RUN ? 'DRY RUN (aucun appel API)' : 'RÉEL (POST /users/provision/bulk)'}${LIMIT ? ` | Limit: ${LIMIT}` : ''}`)
  console.log(`Import batch : ${IMPORT_BATCH}`)
  console.log('─────────────────────────────────────────────────────────────────')

  // Charger le mapping existant
  if (!fs.existsSync(MAP_FILE)) throw new Error(`Fichier mapping introuvable : ${MAP_FILE}`)
  const existingMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf-8')) as Record<string, string>
  const mappedUids  = new Set(Object.keys(existingMap).map(Number))
  console.log(`Mapping actuel : ${mappedUids.size} entrées`)

  // Requête Drupal
  const drupal = await mysql.createConnection(DRUPAL_DB_URL)
  const [users] = await drupal.query<DrupalUser[]>(
    `SELECT u.uid, f.mail, f.created,
            n.field_nom_value          AS nom,
            p.field_prenom_value       AS prenom,
            s.field_sexe_value         AS sexe,
            t.field_telephone_value    AS telephone,
            d.field_date_de_naissance_value AS date_naissance,
            NULL                       AS region,
            NULL                       AS commune
       FROM users u
       JOIN users_field_data f ON f.uid = u.uid AND f.status = 1
       LEFT JOIN user__field_nom               n ON n.entity_id = u.uid AND n.deleted = 0
       LEFT JOIN user__field_prenom            p ON p.entity_id = u.uid AND p.deleted = 0
       LEFT JOIN user__field_sexe              s ON s.entity_id = u.uid AND s.deleted = 0
       LEFT JOIN user__field_telephone         t ON t.entity_id = u.uid AND t.deleted = 0
       LEFT JOIN user__field_date_de_naissance d ON d.entity_id = u.uid AND d.deleted = 0
       WHERE u.uid > 0 AND f.mail IS NOT NULL
       ${LIMIT ? `LIMIT ${LIMIT}` : ''}`
  )
  await drupal.end()

  // Filtrer les non-mappés
  const unmapped = users.filter(u => !mappedUids.has(u.uid))
  console.log(`Utilisateurs Drupal actifs : ${users.length}`)
  console.log(`Non-mappés à créer         : ${unmapped.length}`)

  if (unmapped.length === 0) {
    console.log('\nAucun compte à créer — mapping déjà complet.')
    return
  }

  // Construire le payload bulk
  const payload: BulkUser[] = unmapped
    .filter(u => u.mail?.trim())
    .map(u => {
      const email = u.mail.trim().toLowerCase()
      const names = deriveNames(u.prenom, u.nom, email)
      return {
        drupal_uid:      u.uid,
        email,
        phone:           normalizePhone(u.telephone),
        first_name:      names.first,
        last_name:       names.last,
        gender:          mapGender(u.sexe),
        date_of_birth:   u.date_naissance ? u.date_naissance.split('T')[0] : null,
        region:          mapRegion(u.region),
        commune:         u.commune,
        source_platform: 'drupal_migration',
        import_batch:    IMPORT_BATCH,
      }
    })

  console.log(`Payload prêt   : ${payload.length} entrées (${unmapped.length - payload.length} ignorés - email vide)`)

  if (DRY_RUN) {
    console.log('\nDRY RUN — exemple de payload (1ère entrée) :')
    console.log(JSON.stringify(payload[0], null, 2))
    return
  }

  // Appel API par lots de 500 (géré par le client)
  console.log('\nAppel API SSO en cours…')
  const t0 = Date.now()
  const { results } = await client!.provisionBulk(payload)
  const dt = ((Date.now() - t0) / 1000).toFixed(1)

  const created  = results.filter(r => r.created === true).length
  const existed  = results.filter(r => r.created === false).length
  const errored  = results.filter(r => r.error).length
  console.log(`Terminé (${dt}s) : ${created} créés · ${existed} existants · ${errored} erreurs`)

  // Mettre à jour le mapping incrémentalement
  const newMapping = { ...existingMap }
  for (const r of results) {
    if (r.uuid && typeof r.drupal_uid === 'number') {
      newMapping[String(r.drupal_uid)] = r.uuid
    }
  }
  fs.writeFileSync(MAP_FILE, JSON.stringify(newMapping), 'utf-8')
  console.log(`Mapping mis à jour : ${MAP_FILE} (${Object.keys(newMapping).length} entrées)`)

  // Rapport JSON
  fs.mkdirSync('data', { recursive: true })
  const reportPath = path.join('data', `create_sso_accounts_report_${IMPORT_BATCH}.json`)
  fs.writeFileSync(reportPath, JSON.stringify({
    import_batch: IMPORT_BATCH,
    timestamp:    new Date().toISOString(),
    summary:      { sent: payload.length, created, existed, errored, duration_seconds: dt },
    errors:       results.filter((r): r is BulkResult & { error: string } => !!r.error),
  }, null, 2), 'utf-8')
  console.log(`Rapport       : ${reportPath}`)

  if (errored > 0) {
    console.error(`\n⚠ ${errored} entrées en erreur — consulter ${reportPath}`)
    process.exitCode = 1
  }
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
