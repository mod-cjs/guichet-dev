/**
 * Migration Drupal 8/9 → Guichet Jeunesse (Prisma / MariaDB)
 * GUIC-17 — Sprint 0, M1
 *
 * PRÉREQUIS
 * ---------
 * 1. Export SQL Drupal disponible (dump complet ou accès MySQL read-only)
 *    Structure Drupal 8/9 : users + users_field_data + user__field_*
 * 2. CSV export SSO (admin → Utilisateurs → Exporter CSV)
 *    Colonnes requises : "CJS UID (UUID)", "Drupal UID", "Email"
 * 3. Variables d'environnement :
 *    DRUPAL_DB_URL      = mysql://user:pass@host:3306/drupal_db
 *    DATABASE_URL       = mysql://user:pass@host:3306/guichet_jeunesse
 *    CJS_UID_MAP_FILE   = ./data/utilisateurs_export_sso.csv
 *
 * STRATÉGIE DE MAPPING
 * --------------------
 * 1. Par drupal_uid  : si la colonne "Drupal UID" est renseignée dans le CSV SSO
 * 2. Par email       : fallback — jointure sur l'email commun aux deux systèmes
 * Les comptes SSO sans correspondance Drupal sont ignorés.
 *
 * ARCHITECTURE
 * ------------
 * Le SSO détient l'identité (nom, email, téléphone, cjs_uid).
 * Ce script ne crée PAS de comptes SSO — ils existent déjà.
 * Il crée uniquement les données Guichet-spécifiques : ProfilJeune
 *
 * EXÉCUTION
 * ---------
 *   npx tsx scripts/migrate-drupal.ts [--dry-run] [--phase=profils|all]
 *
 * OPTIONS
 * -------
 *   --dry-run    : Analyse sans écriture en base
 *   --phase=X    : Migrer uniquement la phase X (défaut: all)
 *   --limit=N    : Limiter à N enregistrements (debug)
 */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import * as mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN  = process.argv.includes('--dry-run')
const LIMIT    = (() => { const m = process.argv.find(a => a.startsWith('--limit=')); return m ? parseInt(m.split('=')[1]) : undefined })()
const PHASE    = (() => { const m = process.argv.find(a => a.startsWith('--phase=')); return m ? m.split('=')[1] : 'all' })()

const DRUPAL_DB_URL    = process.env.DRUPAL_DB_URL
const CJS_UID_MAP_FILE = process.env.CJS_UID_MAP_FILE ?? './data/drupal_uid_cjs_uid_map.json'

// Colonnes du CSV export SSO (utilisateurs_YYYY-MM-DD.csv)
const SSO_CSV_COL_CJS_UID    = 1 // "CJS UID (UUID)"
const SSO_CSV_COL_DRUPAL_UID = 2 // "Drupal UID"
const SSO_CSV_COL_EMAIL      = 5 // "Email"

// ─── Types ────────────────────────────────────────────────────────────────────

// Structure Drupal 8/9 : jointure users + users_field_data + user__field_*
interface Drupal8User extends RowDataPacket {
  uid:            number
  drupal_uuid:    string   // uuid interne Drupal (≠ cjs_uid)
  mail:           string
  status:         number
  created:        number
  nom:            string | null
  prenom:         string | null
  sexe:           string | null  // 'homme' | 'femme'
  telephone:      string | null
  date_naissance: string | null  // DATE au format YYYY-MM-DD
  type_profil:    string | null
}

interface DrupalNode extends RowDataPacket {
  nid:         number
  type:        string
  title:       string
  uid:         number
  status:      number
  created:     number
  changed:     number
  description: string | null
}

interface MigrationStats {
  profils:    { total: number; ok: number; skipped: number; errors: number }
  opportunites: { total: number; ok: number; skipped: number; errors: number }
  evenements: { total: number; ok: number; skipped: number; errors: number }
  ressources: { total: number; ok: number; skipped: number; errors: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = '' }
    else { current += ch }
  }
  cols.push(current.trim())
  return cols
}

interface SsoMaps {
  byDrupalUid: Map<number, string>  // drupal_uid → cjs_uid
  byEmail:     Map<string, string>  // email (lowercase) → cjs_uid
}

function loadSsoMaps(): SsoMaps {
  if (!fs.existsSync(CJS_UID_MAP_FILE)) {
    throw new Error(`Fichier mapping introuvable : ${CJS_UID_MAP_FILE}`)
  }

  const byDrupalUid = new Map<number, string>()
  const byEmail     = new Map<string, string>()

  if (CJS_UID_MAP_FILE.endsWith('.csv')) {
    const lines = fs.readFileSync(CJS_UID_MAP_FILE, 'utf-8').split('\n').slice(1)
    for (const line of lines) {
      if (!line.trim()) continue
      const cols    = parseCsvLine(line)
      const cjsUid  = cols[SSO_CSV_COL_CJS_UID]?.replace(/^"|"$/g, '')
      const drupalUid = cols[SSO_CSV_COL_DRUPAL_UID]?.replace(/^"|"$/g, '')
      const email   = cols[SSO_CSV_COL_EMAIL]?.replace(/^"|"$/g, '').toLowerCase()
      if (!cjsUid) continue
      if (drupalUid && !isNaN(parseInt(drupalUid))) {
        byDrupalUid.set(parseInt(drupalUid), cjsUid)
      }
      if (email) byEmail.set(email, cjsUid)
    }
    console.log(`Mapping SSO chargé — par drupal_uid: ${byDrupalUid.size} | par email: ${byEmail.size}`)
    return { byDrupalUid, byEmail }
  }

  // Format JSON : { "drupal_uid": "cjs_uuid" }
  const data = JSON.parse(fs.readFileSync(CJS_UID_MAP_FILE, 'utf-8')) as Record<string, string>
  for (const [k, v] of Object.entries(data)) byDrupalUid.set(parseInt(k), v)
  console.log(`Mapping JSON chargé : ${byDrupalUid.size} entrées`)
  return { byDrupalUid, byEmail }
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null
  // Supprimer espaces et tirets
  const digits = raw.replace(/[\s\-().]/g, '')
  // Déjà E.164
  if (/^\+\d{10,15}$/.test(digits)) return digits
  // 9 chiffres locaux sénégalais → +221
  if (/^\d{9}$/.test(digits)) return `+221${digits}`
  // 8 chiffres avec leading zero → +221 + sans le zero
  if (/^0\d{9}$/.test(digits)) return `+221${digits.slice(1)}`
  return null // format non reconnu — on ne stocke pas
}

function mapGenre(val: string | null): string | null {
  if (!val) return null
  const v = val.toLowerCase()
  if (v === 'homme' || v === 'm' || v === 'male')   return 'HOMME'
  if (v === 'femme' || v === 'f' || v === 'female') return 'FEMME'
  return 'AUTRE'
}

function drupalTimestampToDate(ts: number): Date {
  return new Date(ts * 1000)
}

function slugify(text: string, id: number): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 260)
    + `-${id}`
}

// ─── Phase 1 : ProfilJeune (Drupal 8/9) ──────────────────────────────────────

async function migrateProfilsJeune(
  drupal:  mysql.Connection,
  prisma:  PrismaClient,
  maps:    SsoMaps,
  stats:   MigrationStats,
) {
  console.log('\n[Phase 1] Migration des profils jeune (Drupal 8/9)...')

  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : ''

  // Jointure complète Drupal 8/9 : users + users_field_data + champs custom
  const [users] = await drupal.query<Drupal8User[]>(
    `SELECT
       u.uid,
       u.uuid                                    AS drupal_uuid,
       f.mail,
       f.status,
       f.created,
       n.field_nom_value                         AS nom,
       p.field_prenom_value                      AS prenom,
       s.field_sexe_value                        AS sexe,
       t.field_telephone_value                   AS telephone,
       DATE(d.field_date_de_naissance_value)     AS date_naissance,
       tp.field_type_de_profile_target_id        AS type_profil
     FROM users u
     JOIN users_field_data f  ON f.uid = u.uid AND f.status = 1
     LEFT JOIN user__field_nom              n  ON n.entity_id  = u.uid AND n.deleted = 0
     LEFT JOIN user__field_prenom           p  ON p.entity_id  = u.uid AND p.deleted = 0
     LEFT JOIN user__field_sexe             s  ON s.entity_id  = u.uid AND s.deleted = 0
     LEFT JOIN user__field_telephone        t  ON t.entity_id  = u.uid AND t.deleted = 0
     LEFT JOIN user__field_date_de_naissance d  ON d.entity_id  = u.uid AND d.deleted = 0
     LEFT JOIN user__field_type_de_profile  tp ON tp.entity_id = u.uid AND tp.deleted = 0
     WHERE u.uid > 0 AND f.mail IS NOT NULL
     ${limitClause}`
  )

  stats.profils.total = users.length
  console.log(`  Utilisateurs Drupal actifs : ${users.length}`)

  let mappedByUid = 0, mappedByEmail = 0, notMapped = 0

  for (const user of users) {
    // Stratégie 1 : mapping par drupal_uid
    let cjsUid = maps.byDrupalUid.get(user.uid)
    if (cjsUid) { mappedByUid++ }
    else {
      // Stratégie 2 : mapping par email
      cjsUid = maps.byEmail.get(user.mail?.toLowerCase() ?? '')
      if (cjsUid) { mappedByEmail++ }
    }

    if (!cjsUid) {
      notMapped++
      stats.profils.skipped++
      continue
    }

    const existing = await prisma.profilJeune.findUnique({ where: { cjsUid } })
    if (existing) { stats.profils.skipped++; continue }

    try {
      if (!DRY_RUN) {
        await prisma.profilJeune.create({
          data: {
            cjsUid,
            drupalUid:    user.uid,
            genre:        mapGenre(user.sexe) as any,
            dateNaissance: user.date_naissance ? new Date(user.date_naissance) : null,
            createdAt:    drupalTimestampToDate(user.created),
          },
        })
      }
      stats.profils.ok++
    } catch (err) {
      console.error(`  [ERR] uid=${user.uid} mail=${user.mail}`, err)
      stats.profils.errors++
    }
  }

  console.log(`  Mapping — par drupal_uid: ${mappedByUid} | par email: ${mappedByEmail} | non trouvés: ${notMapped}`)
  console.log(`  → ok: ${stats.profils.ok} | skipped: ${stats.profils.skipped} | errors: ${stats.profils.errors}`)
}

// ─── Phase 2 : Opportunités ───────────────────────────────────────────────────

async function migrateOpportunites(
  drupal: mysql.Connection,
  prisma: PrismaClient,
  stats:  MigrationStats,
) {
  console.log('\n[Phase 2] Migration des opportunités...')

  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : ''

  // Les types de nœuds Drupal pour les opportunités — adapter selon la structure réelle
  const DRUPAL_OPP_TYPES = ['offre_emploi', 'stage', 'volontariat', 'formation', 'bourse', 'appel_projet']

  const [nodes] = await drupal.query<DrupalNode[]>(
    `SELECT n.nid, n.type, n.title, n.uid, n.status, n.created, n.changed,
            b.body_value AS description
     FROM node n
     LEFT JOIN field_data_body b ON b.entity_id = n.nid AND b.entity_type = 'node'
     WHERE n.type IN (${DRUPAL_OPP_TYPES.map(() => '?').join(',')})
     AND n.status IN (0, 1)
     ${limitClause}`,
    DRUPAL_OPP_TYPES
  )

  stats.opportunites.total = nodes.length
  console.log(`  Nœuds opportunités : ${nodes.length}`)

  // Mapping type Drupal → enum Prisma
  const typeMap: Record<string, string> = {
    offre_emploi: 'EMPLOI',
    stage:        'STAGE',
    volontariat:  'VOLONTARIAT',
    formation:    'FORMATION',
    bourse:       'BOURSE',
    appel_projet: 'APPEL_PROJET',
  }

  for (const node of nodes) {
    const existing = await prisma.opportunite.findUnique({ where: { drupalNid: node.nid } })
    if (existing) {
      stats.opportunites.skipped++
      continue
    }

    try {
      if (!DRY_RUN) {
        await prisma.opportunite.create({
          data: {
            drupalNid:   node.nid,
            slug:        slugify(node.title, node.nid),
            titre:       node.title,
            description: node.description ?? '',
            type:        typeMap[node.type] as any ?? 'EMPLOI',
            domaine:     'Non classé', // À enrichir via field_data_field_domaine
            publiePar:   'migration-drupal', // Pas de cjsUid recruteur — placeholder
            statut:      node.status === 1 ? 'PUBLIE' : 'ARCHIVE',
            createdAt:   drupalTimestampToDate(node.created),
            updatedAt:   drupalTimestampToDate(node.changed),
          },
        })
      }
      stats.opportunites.ok++
    } catch (err) {
      console.error(`  [ERR] nid=${node.nid}`, err)
      stats.opportunites.errors++
    }
  }

  console.log(`  → ok: ${stats.opportunites.ok} | skipped: ${stats.opportunites.skipped} | errors: ${stats.opportunites.errors}`)
}

// ─── Phase 3 : Événements ─────────────────────────────────────────────────────

async function migrateEvenements(
  drupal: mysql.Connection,
  prisma: PrismaClient,
  stats:  MigrationStats,
) {
  console.log('\n[Phase 3] Migration des événements...')

  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : ''

  const [nodes] = await drupal.query<DrupalNode[]>(
    `SELECT n.nid, n.type, n.title, n.uid, n.status, n.created, n.changed,
            b.body_value AS description
     FROM node n
     LEFT JOIN field_data_body b ON b.entity_id = n.nid AND b.entity_type = 'node'
     WHERE n.type IN ('evenement', 'event', 'formation_event')
     AND n.status IN (0, 1)
     ${limitClause}`
  )

  stats.evenements.total = nodes.length
  console.log(`  Nœuds événements : ${nodes.length}`)

  for (const node of nodes) {
    const existing = await prisma.evenement.findUnique({ where: { drupalNid: node.nid } })
    if (existing) {
      stats.evenements.skipped++
      continue
    }

    try {
      if (!DRY_RUN) {
        // Dates réelles à extraire de field_data_field_date_debut / field_date_fin
        const dateRef = drupalTimestampToDate(node.created)
        await prisma.evenement.create({
          data: {
            drupalNid:    node.nid,
            slug:         slugify(node.title, node.nid),
            titre:        node.title,
            description:  node.description ?? '',
            type:         'AUTRE',
            dateDebut:    dateRef,
            dateFin:      dateRef,
            organisateur: 'migration-drupal',
            statut:       node.status === 1 ? 'PUBLIE' : 'ARCHIVE',
            createdAt:    dateRef,
            updatedAt:    drupalTimestampToDate(node.changed),
          },
        })
      }
      stats.evenements.ok++
    } catch (err) {
      console.error(`  [ERR] nid=${node.nid}`, err)
      stats.evenements.errors++
    }
  }

  console.log(`  → ok: ${stats.evenements.ok} | skipped: ${stats.evenements.skipped} | errors: ${stats.evenements.errors}`)
}

// ─── Phase 4 : Ressources ─────────────────────────────────────────────────────

async function migrateRessources(
  drupal: mysql.Connection,
  prisma: PrismaClient,
  stats:  MigrationStats,
) {
  console.log('\n[Phase 4] Migration des ressources pédagogiques...')

  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : ''

  const [nodes] = await drupal.query<DrupalNode[]>(
    `SELECT n.nid, n.type, n.title, n.uid, n.status, n.created, n.changed,
            b.body_value AS description
     FROM node n
     LEFT JOIN field_data_body b ON b.entity_id = n.nid AND b.entity_type = 'node'
     WHERE n.type IN ('ressource', 'document', 'video', 'guide')
     AND n.status IN (0, 1)
     ${limitClause}`
  )

  stats.ressources.total = nodes.length
  console.log(`  Nœuds ressources : ${nodes.length}`)

  for (const node of nodes) {
    const existing = await prisma.ressource.findUnique({ where: { drupalNid: node.nid } })
    if (existing) {
      stats.ressources.skipped++
      continue
    }

    const formatMap: Record<string, string> = {
      video:    'VIDEO',
      document: 'PDF',
      guide:    'PDF',
      ressource: 'ARTICLE',
    }

    try {
      if (!DRY_RUN) {
        await prisma.ressource.create({
          data: {
            drupalNid:  node.nid,
            slug:       slugify(node.title, node.nid),
            titre:      node.title,
            description:node.description ?? null,
            theme:      'Non classé',
            format:     formatMap[node.type] as any ?? 'ARTICLE',
            statut:     node.status === 1 ? 'PUBLIE' : 'ARCHIVE',
            createdAt:  drupalTimestampToDate(node.created),
            updatedAt:  drupalTimestampToDate(node.changed),
          },
        })
      }
      stats.ressources.ok++
    } catch (err) {
      console.error(`  [ERR] nid=${node.nid}`, err)
      stats.ressources.errors++
    }
  }

  console.log(`  → ok: ${stats.ressources.ok} | skipped: ${stats.ressources.skipped} | errors: ${stats.ressources.errors}`)
}

// ─── Rapport ─────────────────────────────────────────────────────────────────

function printReport(stats: MigrationStats, startMs: number) {
  const durationSec = ((Date.now() - startMs) / 1000).toFixed(1)
  const report = [
    '',
    '═══════════════════════════════════════════════════',
    `  RAPPORT DE MIGRATION — GUIC-17`,
    `  Mode: ${DRY_RUN ? 'DRY RUN (aucune écriture)' : 'RÉEL'}`,
    `  Durée: ${durationSec}s`,
    '═══════════════════════════════════════════════════',
    `  ProfilJeune   : ${stats.profils.ok} ok / ${stats.profils.skipped} skip / ${stats.profils.errors} err (total ${stats.profils.total})`,
    `  Opportunités  : ${stats.opportunites.ok} ok / ${stats.opportunites.skipped} skip / ${stats.opportunites.errors} err (total ${stats.opportunites.total})`,
    `  Événements    : ${stats.evenements.ok} ok / ${stats.evenements.skipped} skip / ${stats.evenements.errors} err (total ${stats.evenements.total})`,
    `  Ressources    : ${stats.ressources.ok} ok / ${stats.ressources.skipped} skip / ${stats.ressources.errors} err (total ${stats.ressources.total})`,
    '═══════════════════════════════════════════════════',
  ].join('\n')

  console.log(report)

  const reportPath = path.join('data', `migration_report_${Date.now()}.txt`)
  fs.mkdirSync('data', { recursive: true })
  fs.writeFileSync(reportPath, report)
  console.log(`\nRapport écrit : ${reportPath}`)
}

// ─── Entrée principale ────────────────────────────────────────────────────────

async function main() {
  const startMs = Date.now()

  if (!DRUPAL_DB_URL) {
    throw new Error('DRUPAL_DB_URL est requis. Exemple: mysql://user:pass@host:3306/drupal_db')
  }

  console.log(`\nGuichet Jeunesse — Migration Drupal → Prisma`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'RÉEL'} | Phase: ${PHASE}${LIMIT ? ` | Limit: ${LIMIT}` : ''}`)
  console.log('─────────────────────────────────────────────')

  const maps    = loadSsoMaps()
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
  const prisma  = new PrismaClient({ adapter })
  const drupal  = await mysql.createConnection(DRUPAL_DB_URL)

  const stats: MigrationStats = {
    profils:       { total: 0, ok: 0, skipped: 0, errors: 0 },
    opportunites:  { total: 0, ok: 0, skipped: 0, errors: 0 },
    evenements:    { total: 0, ok: 0, skipped: 0, errors: 0 },
    ressources:    { total: 0, ok: 0, skipped: 0, errors: 0 },
  }

  try {
    if (PHASE === 'all' || PHASE === 'profils') {
      await migrateProfilsJeune(drupal, prisma, maps, stats)
    }
    if (PHASE === 'all' || PHASE === 'opportunites') {
      await migrateOpportunites(drupal, prisma, stats)
    }
    if (PHASE === 'all' || PHASE === 'evenements') {
      await migrateEvenements(drupal, prisma, stats)
    }
    if (PHASE === 'all' || PHASE === 'ressources') {
      await migrateRessources(drupal, prisma, stats)
    }
  } finally {
    await drupal.end()
    await prisma.$disconnect()
    printReport(stats, startMs)
  }
}

main().catch(err => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})
