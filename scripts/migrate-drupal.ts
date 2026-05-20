/**
 * Migration Drupal 8/9 → Guichet Jeunesse (Prisma / MariaDB)
 * GUIC-17 — M1
 *
 * PRÉREQUIS (dans cet ordre)
 * --------------------------
 * 1. Migrations Prisma appliquées    → npx prisma migrate deploy
 * 2. Comptes SSO créés pour non-mappés → npm run migrate:sso:create
 * 3. Utilisateurs synchronisés       → npm run migrate:sso:sync
 * 4. Mapping à jour                  → CJS_UID_MAP_FILE pointe vers map_updated.json
 *
 * VARIABLES
 * ---------
 *   DRUPAL_DB_URL    = mysql://user:pass@host:3306/drupal_db
 *   DATABASE_URL     = mysql://user:pass@host:3306/guichet_jeunesse
 *   CJS_UID_MAP_FILE = ./data/drupal_uid_cjs_uid_map.json  (défaut)
 *
 * EXÉCUTION
 * ---------
 *   npx tsx scripts/migrate-drupal.ts [--dry-run] [--phase=profils|opportunites|evenements|ressources|all] [--limit=N] [--skip-preflight]
 */

import { PrismaClient }       from '@prisma/client'
import { PrismaMariaDb }      from '@prisma/adapter-mariadb'
import * as mysql             from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import * as fs                from 'fs'
import * as path              from 'path'

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN         = process.argv.includes('--dry-run')
const SKIP_PREFLIGHT  = process.argv.includes('--skip-preflight')
const LIMIT           = (() => { const m = process.argv.find(a => a.startsWith('--limit=')); return m ? parseInt(m.split('=')[1]) : undefined })()
const PHASE           = (() => { const m = process.argv.find(a => a.startsWith('--phase=')); return m ? m.split('=')[1] : 'all' })()
const DRUPAL_DB_URL   = process.env.DRUPAL_DB_URL
const CJS_UID_MAP_FILE = process.env.CJS_UID_MAP_FILE ?? './data/drupal_uid_cjs_uid_map.json'
const CHUNK_SIZE      = 100

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrupalUser extends RowDataPacket {
  uid:            number
  mail:           string
  status:         number
  created:        number
  nom:            string | null
  prenom:         string | null
  sexe:           string | null
  telephone:      string | null
  date_naissance: string | null
  region:         string | null
  commune:        string | null
}

interface DrupalNode extends RowDataPacket {
  nid:        number
  type:       string
  title:      string
  uid:        number
  status:     number
  created:    number
  changed:    number
  body:       string | null
  lien:       string | null
  region:     string | null
  date_debut: string | null
  date_fin:   string | null
  lieu:       string | null
  domaine:    string | null
  type_opp:   string | null
}

interface MigrationStats {
  profils: {
    total:             number
    created:           number
    alreadyExists:     number
    notMapped:         number
    utilisateurAbsent: number
    errors:            number
  }
  opportunites: { total: number; created: number; alreadyExists: number; errors: number }
  evenements:   { total: number; created: number; alreadyExists: number; errors: number }
  ressources:   { total: number; created: number; alreadyExists: number; errors: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface SsoMaps {
  byDrupalUid: Map<number, string>
  byEmail:     Map<string, string>
}

function loadSsoMaps(): SsoMaps {
  if (!fs.existsSync(CJS_UID_MAP_FILE)) {
    throw new Error(`Fichier mapping introuvable : ${CJS_UID_MAP_FILE}`)
  }
  const raw         = JSON.parse(fs.readFileSync(CJS_UID_MAP_FILE, 'utf-8')) as Record<string, string>
  const byDrupalUid = new Map<number, string>()
  const byEmail     = new Map<string, string>()
  for (const [k, v] of Object.entries(raw)) {
    const uid = parseInt(k)
    if (!isNaN(uid)) byDrupalUid.set(uid, v)
  }
  console.log(`Mapping SSO chargé — par drupal_uid: ${byDrupalUid.size}`)
  return { byDrupalUid, byEmail }
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/[\s\-().]/g, '')
  if (/^\+\d{10,15}$/.test(digits)) return digits
  if (/^\d{9}$/.test(digits))       return `+221${digits}`
  if (/^0\d{9}$/.test(digits))      return `+221${digits.slice(1)}`
  if (/^221\d{9}$/.test(digits))    return `+${digits}`
  return null
}

function mapGenre(val: string | null): 'M' | 'F' | null {
  if (!val) return null
  const v = val.toLowerCase()
  if (v === 'homme' || v === 'm' || v === 'male')   return 'M'
  if (v === 'femme' || v === 'f' || v === 'female') return 'F'
  return null
}

function mapRegion(val: string | null): string | null {
  if (!val) return null
  const map: Record<string, string> = {
    'dakar': 'Dakar', 'thiès': 'Thies', 'thies': 'Thies', 'diourbel': 'Diourbel',
    'fatick': 'Fatick', 'kaolack': 'Kaolack', 'kaffrine': 'Kaffrine',
    'louga': 'Louga', 'saint-louis': 'Saint_Louis', 'saint_louis': 'Saint_Louis',
    'matam': 'Matam', 'tambacounda': 'Tambacounda', 'kédougou': 'Kedougou',
    'kedougou': 'Kedougou', 'kolda': 'Kolda', 'ziguinchor': 'Ziguinchor',
    'sédhiou': 'Sedhiou', 'sedhiou': 'Sedhiou',
  }
  return map[val.toLowerCase()] ?? null
}

function mapDomaine(val: string | null): string {
  if (!val) return 'Autre'
  const v = val.toLowerCase()
  if (v.includes('agri') || v.includes('élevage') || v.includes('elevage')) return 'Agriculture'
  if (v.includes('numéri') || v.includes('numeri') || v.includes('tech') || v.includes('info')) return 'Numerique'
  if (v.includes('entrepr')) return 'Entrepreneuriat'
  if (v.includes('citoyen') || v.includes('gouver')) return 'Citoyennete'
  if (v.includes('environ') || v.includes('climat')) return 'Environnement'
  if (v.includes('santé') || v.includes('sante')) return 'Sante'
  if (v.includes('éduc') || v.includes('educ') || v.includes('form')) return 'Education'
  if (v.includes('cultur') || v.includes('art')) return 'Culture'
  return 'Autre'
}

function mapTypeOpportunite(drupalType: string, typeOpp: string | null): string {
  const src = (typeOpp ?? drupalType).toLowerCase()
  if (src.includes('stage'))  return 'Stage'
  if (src.includes('form'))   return 'Formation'
  if (src.includes('bourse')) return 'Bourse'
  if (src.includes('volont')) return 'Volontariat'
  if (src.includes('appel'))  return 'Appel_a_projets'
  return 'Emploi'
}

function mapTypeEvenement(drupalType: string): string {
  const map: Record<string, string> = {
    'atelier': 'Atelier', 'webinar': 'Webinar',
    'conference': 'Conference', 'formation_event': 'Formation',
  }
  return map[drupalType] ?? 'Forum'
}

function mapTypeRessource(drupalType: string): string {
  const map: Record<string, string> = {
    'video': 'Video', 'document': 'PDF', 'guide': 'Guide', 'outil': 'Outil',
  }
  return map[drupalType] ?? 'Lien'
}

function toDate(ts: number): Date {
  return new Date(ts * 1000)
}

// ─── Pre-flight ───────────────────────────────────────────────────────────────

async function preflight(prisma: PrismaClient, maps: SsoMaps): Promise<void> {
  console.log('\n[Pre-flight] Vérifications...')
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Migrations Prisma appliquées
  try {
    await prisma.$queryRaw`SELECT 1 FROM _prisma_migrations LIMIT 1`
  } catch {
    errors.push('Table _prisma_migrations inaccessible — prisma migrate deploy non exécuté ?')
  }

  // 2. Compter les Utilisateurs en base vs taille du mapping
  const nbUtilisateurs = await prisma.utilisateur.count()
  const nbMapped       = maps.byDrupalUid.size
  const nbProfilJeune  = await prisma.profilJeune.count()

  console.log(`  Utilisateurs en DB    : ${nbUtilisateurs}`)
  console.log(`  Mappés (drupal→sso)   : ${nbMapped}`)
  console.log(`  ProfilJeune en DB     : ${nbProfilJeune}`)

  if (nbUtilisateurs === 0) {
    errors.push(
      `Aucun Utilisateur en base — exécuter d'abord : npm run migrate:sso:sync`
    )
  } else if (nbUtilisateurs < nbMapped * 0.8) {
    warnings.push(
      `Seulement ${nbUtilisateurs} Utilisateurs pour ${nbMapped} mappés (${Math.round(nbUtilisateurs / nbMapped * 100)}%) — ` +
      `relancer migrate:sso:sync avant le run complet`
    )
  }

  // 3. Vérifier que les tables Drupal requises existent
  // (déjà géré par la connexion Drupal plus haut)

  if (errors.length > 0) {
    console.error('\n[Pre-flight] ❌ Erreurs bloquantes :')
    errors.forEach(e => console.error(`  - ${e}`))
    throw new Error('Pre-flight échoué — corriger les erreurs ci-dessus avant de continuer.')
  }

  if (warnings.length > 0) {
    console.warn('\n[Pre-flight] ⚠️  Avertissements :')
    warnings.forEach(w => console.warn(`  - ${w}`))
    console.warn('')
  }

  console.log('  ✓ Pre-flight OK\n')
}

// ─── Phase 1 : ProfilJeune ────────────────────────────────────────────────────

async function migrateProfilsJeune(
  drupal: mysql.Connection,
  prisma: PrismaClient,
  maps:   SsoMaps,
  stats:  MigrationStats,
) {
  console.log('[Phase 1] Migration des profils jeune...')

  const limitSql = LIMIT ? `LIMIT ${LIMIT}` : ''

  const [users] = await drupal.query<DrupalUser[]>(
    `SELECT
       u.uid,
       f.mail,
       f.status,
       f.created,
       n.field_nom_value                     AS nom,
       p.field_prenom_value                  AS prenom,
       s.field_sexe_value                    AS sexe,
       t.field_telephone_value               AS telephone,
       d.field_date_de_naissance_value       AS date_naissance,
       r.field_region_value                  AS region,
       c.field_commune_value                 AS commune
     FROM users u
     JOIN users_field_data f   ON f.uid = u.uid AND f.status = 1
     LEFT JOIN user__field_nom               n  ON n.entity_id = u.uid AND n.deleted = 0
     LEFT JOIN user__field_prenom            p  ON p.entity_id = u.uid AND p.deleted = 0
     LEFT JOIN user__field_sexe              s  ON s.entity_id = u.uid AND s.deleted = 0
     LEFT JOIN user__field_telephone         t  ON t.entity_id = u.uid AND t.deleted = 0
     LEFT JOIN user__field_date_de_naissance d  ON d.entity_id = u.uid AND d.deleted = 0
     LEFT JOIN user__field_region            r  ON r.entity_id = u.uid AND r.deleted = 0
     LEFT JOIN user__field_commune           c  ON c.entity_id = u.uid AND c.deleted = 0
     WHERE u.uid > 0 AND f.mail IS NOT NULL
     ${limitSql}`
  )

  stats.profils.total = users.length
  console.log(`  Utilisateurs Drupal actifs : ${users.length}`)

  // Pré-charger les ProfilJeune existants (une seule requête — élimine le N+1)
  const existingProfils = await prisma.profilJeune.findMany({ select: { cjsUid: true } })
  const existingProfilSet = new Set(existingProfils.map(p => p.cjsUid))

  // Pré-charger les Utilisateurs existants
  const existingUtilisateurs = await prisma.utilisateur.findMany({ select: { cjsUid: true } })
  const existingUtilisateurSet = new Set(existingUtilisateurs.map(u => u.cjsUid))

  let byUid = 0, byEmail = 0

  for (const user of users) {
    // Résoudre cjsUid
    let cjsUid = maps.byDrupalUid.get(user.uid)
    if (cjsUid) { byUid++ }
    else {
      cjsUid = maps.byEmail.get(user.mail?.toLowerCase() ?? '')
      if (cjsUid) { byEmail++ }
    }

    if (!cjsUid) {
      stats.profils.notMapped++
      continue
    }

    // Vérifier que l'Utilisateur parent existe (FK guard)
    if (!existingUtilisateurSet.has(cjsUid)) {
      stats.profils.utilisateurAbsent++
      continue
    }

    // Idempotence : skip si ProfilJeune déjà présent
    if (existingProfilSet.has(cjsUid)) {
      stats.profils.alreadyExists++
      continue
    }

    try {
      if (!DRY_RUN) {
        await prisma.profilJeune.create({
          data: { cjsUid, createdAt: toDate(user.created) },
        })
        existingProfilSet.add(cjsUid) // mettre à jour le set en mémoire
      }
      stats.profils.created++
    } catch (err) {
      console.error(`  [ERR] uid=${user.uid} mail=${user.mail}`, (err as Error).message)
      stats.profils.errors++
    }
  }

  console.log(`  Mapping — par drupal_uid: ${byUid} | par email: ${byEmail} | non trouvés: ${stats.profils.notMapped}`)
  if (stats.profils.utilisateurAbsent > 0) {
    console.warn(`  ⚠️  Utilisateur absent en DB : ${stats.profils.utilisateurAbsent} → relancer migrate:sso:sync`)
  }
  console.log(`  → créés: ${stats.profils.created} | existants: ${stats.profils.alreadyExists} | non-mappés: ${stats.profils.notMapped} | erreurs: ${stats.profils.errors}`)
}

// ─── Phase 2 : Opportunités ───────────────────────────────────────────────────

async function migrateOpportunites(
  drupal: mysql.Connection,
  prisma: PrismaClient,
  stats:  MigrationStats,
) {
  console.log('\n[Phase 2] Migration des opportunités...')

  const TYPES = ['opportunites', 'offre_emploi', 'stage', 'formation', 'bourse', 'volontariat', 'appel_projets']
  const limitSql = LIMIT ? `LIMIT ${LIMIT}` : ''

  // Vérifier que node_field_data existe
  try {
    await drupal.query('SELECT 1 FROM node_field_data LIMIT 1')
  } catch {
    console.warn('  ⚠️  Table node_field_data absente du dump Drupal — phase ignorée.')
    return
  }

  const [nodes] = await drupal.query<DrupalNode[]>(
    `SELECT
       n.nid, n.type, n.title, n.uid, n.status, n.created, n.changed,
       b.body_value                        AS body,
       lien.field_lien_externe_uri         AS lien,
       reg.field_region_value              AS region,
       dom.field_domaine_target_id         AS domaine,
       type_o.field_type_opportunite_value AS type_opp
     FROM node_field_data n
     LEFT JOIN node__body                    b      ON b.entity_id      = n.nid AND b.deleted = 0
     LEFT JOIN node__field_lien_externe      lien   ON lien.entity_id   = n.nid AND lien.deleted = 0
     LEFT JOIN node__field_region            reg    ON reg.entity_id    = n.nid AND reg.deleted = 0
     LEFT JOIN node__field_domaine           dom    ON dom.entity_id    = n.nid AND dom.deleted = 0
     LEFT JOIN node__field_type_opportunite  type_o ON type_o.entity_id = n.nid AND type_o.deleted = 0
     WHERE n.type IN (${TYPES.map(() => '?').join(',')})
     ${limitSql}`,
    TYPES
  )

  stats.opportunites.total = nodes.length
  console.log(`  Nœuds opportunités : ${nodes.length}`)
  if (nodes.length === 0) return

  // Pré-charger les drupalNid existants
  const existing = await prisma.opportunite.findMany({ select: { drupalNid: true } })
  const existingNids = new Set(existing.map(o => o.drupalNid))

  for (const node of nodes) {
    if (existingNids.has(node.nid)) { stats.opportunites.alreadyExists++; continue }

    try {
      if (!DRY_RUN) {
        await prisma.opportunite.create({
          data: {
            drupalNid:    node.nid,
            titre:        node.title,
            description:  node.body ?? '',
            type:         mapTypeOpportunite(node.type, node.type_opp) as any,
            domaine:      mapDomaine(node.domaine) as any,
            region:       mapRegion(node.region) as any,
            organisation: 'Migration Drupal',
            lienExterne:  node.lien ?? null,
            statut:       (node.status === 1 ? 'publiee' : 'archivee') as any,
            createdAt:    toDate(node.created),
            updatedAt:    toDate(node.changed),
          },
        })
        existingNids.add(node.nid)
      }
      stats.opportunites.created++
    } catch (err) {
      console.error(`  [ERR] nid=${node.nid} "${node.title}"`, (err as Error).message)
      stats.opportunites.errors++
    }
  }

  console.log(`  → créés: ${stats.opportunites.created} | existants: ${stats.opportunites.alreadyExists} | erreurs: ${stats.opportunites.errors}`)
}

// ─── Phase 3 : Événements ─────────────────────────────────────────────────────

async function migrateEvenements(
  drupal: mysql.Connection,
  prisma: PrismaClient,
  stats:  MigrationStats,
) {
  console.log('\n[Phase 3] Migration des événements...')

  const TYPES = ['evenement', 'event', 'atelier', 'webinar', 'conference', 'formation_event']
  const limitSql = LIMIT ? `LIMIT ${LIMIT}` : ''

  try {
    await drupal.query('SELECT 1 FROM node_field_data LIMIT 1')
  } catch {
    console.warn('  ⚠️  Table node_field_data absente du dump Drupal — phase ignorée.')
    return
  }

  const [nodes] = await drupal.query<DrupalNode[]>(
    `SELECT
       n.nid, n.type, n.title, n.uid, n.status, n.created, n.changed,
       b.body_value              AS body,
       dd.field_date_debut_value AS date_debut,
       df.field_date_fin_value   AS date_fin,
       li.field_lieu_value       AS lieu,
       reg.field_region_value    AS region
     FROM node_field_data n
     LEFT JOIN node__body             b   ON b.entity_id   = n.nid AND b.deleted = 0
     LEFT JOIN node__field_date_debut dd  ON dd.entity_id  = n.nid AND dd.deleted = 0
     LEFT JOIN node__field_date_fin   df  ON df.entity_id  = n.nid AND df.deleted = 0
     LEFT JOIN node__field_lieu       li  ON li.entity_id  = n.nid AND li.deleted = 0
     LEFT JOIN node__field_region     reg ON reg.entity_id = n.nid AND reg.deleted = 0
     WHERE n.type IN (${TYPES.map(() => '?').join(',')})
     ${limitSql}`,
    TYPES
  )

  stats.evenements.total = nodes.length
  console.log(`  Nœuds événements : ${nodes.length}`)
  if (nodes.length === 0) return

  const existing = await prisma.evenement.findMany({ select: { drupalNid: true } })
  const existingNids = new Set(existing.map(e => e.drupalNid))

  for (const node of nodes) {
    if (existingNids.has(node.nid)) { stats.evenements.alreadyExists++; continue }

    const dateDebut = node.date_debut ? new Date(node.date_debut) : toDate(node.created)
    const dateFin   = node.date_fin   ? new Date(node.date_fin)   : null

    try {
      if (!DRY_RUN) {
        await prisma.evenement.create({
          data: {
            drupalNid:   node.nid,
            titre:       node.title,
            description: node.body ?? '',
            type:        mapTypeEvenement(node.type) as any,
            dateDebut,
            dateFin,
            lieu:        node.lieu ?? 'Non renseigné',
            statut:      (node.status === 1
              ? (dateDebut > new Date() ? 'a_venir' : 'termine')
              : 'annule') as any,
            createdAt:   toDate(node.created),
            updatedAt:   toDate(node.changed),
          },
        })
        existingNids.add(node.nid)
      }
      stats.evenements.created++
    } catch (err) {
      console.error(`  [ERR] nid=${node.nid} "${node.title}"`, (err as Error).message)
      stats.evenements.errors++
    }
  }

  console.log(`  → créés: ${stats.evenements.created} | existants: ${stats.evenements.alreadyExists} | erreurs: ${stats.evenements.errors}`)
}

// ─── Phase 4 : Ressources ─────────────────────────────────────────────────────

async function migrateRessources(
  drupal: mysql.Connection,
  prisma: PrismaClient,
  stats:  MigrationStats,
) {
  console.log('\n[Phase 4] Migration des ressources...')

  const TYPES = ['ressources', 'ressource', 'document', 'video', 'guide', 'outil']
  const limitSql = LIMIT ? `LIMIT ${LIMIT}` : ''

  try {
    await drupal.query('SELECT 1 FROM node_field_data LIMIT 1')
  } catch {
    console.warn('  ⚠️  Table node_field_data absente du dump Drupal — phase ignorée.')
    return
  }

  const [nodes] = await drupal.query<DrupalNode[]>(
    `SELECT
       n.nid, n.type, n.title, n.uid, n.status, n.created, n.changed,
       b.body_value                AS body,
       lien.field_lien_uri         AS lien,
       dom.field_domaine_target_id AS domaine
     FROM node_field_data n
     LEFT JOIN node__body           b    ON b.entity_id    = n.nid AND b.deleted = 0
     LEFT JOIN node__field_lien     lien ON lien.entity_id = n.nid AND lien.deleted = 0
     LEFT JOIN node__field_domaine  dom  ON dom.entity_id  = n.nid AND dom.deleted = 0
     WHERE n.type IN (${TYPES.map(() => '?').join(',')})
     ${limitSql}`,
    TYPES
  )

  stats.ressources.total = nodes.length
  console.log(`  Nœuds ressources : ${nodes.length}`)
  if (nodes.length === 0) return

  const existing = await prisma.ressource.findMany({ select: { drupalNid: true } })
  const existingNids = new Set(existing.map(r => r.drupalNid))

  for (const node of nodes) {
    if (existingNids.has(node.nid)) { stats.ressources.alreadyExists++; continue }

    try {
      if (!DRY_RUN) {
        await prisma.ressource.create({
          data: {
            drupalNid:   node.nid,
            titre:       node.title,
            description: node.body ?? '',
            type:        mapTypeRessource(node.type) as any,
            theme:       mapDomaine(node.domaine),
            url:         node.lien ?? '',
            estPublic:   node.status === 1,
            createdAt:   toDate(node.created),
            updatedAt:   toDate(node.changed),
          },
        })
        existingNids.add(node.nid)
      }
      stats.ressources.created++
    } catch (err) {
      console.error(`  [ERR] nid=${node.nid} "${node.title}"`, (err as Error).message)
      stats.ressources.errors++
    }
  }

  console.log(`  → créés: ${stats.ressources.created} | existants: ${stats.ressources.alreadyExists} | erreurs: ${stats.ressources.errors}`)
}

// ─── Rapport ─────────────────────────────────────────────────────────────────

function printReport(stats: MigrationStats, startMs: number) {
  const duration = ((Date.now() - startMs) / 1000).toFixed(1)

  const hasWarning = stats.profils.utilisateurAbsent > 0 || stats.profils.notMapped > 0
  const totalErrors = stats.profils.errors + stats.opportunites.errors + stats.evenements.errors + stats.ressources.errors

  const lines = [
    '',
    '═══════════════════════════════════════════════════',
    `  RAPPORT DE MIGRATION — GUIC-17`,
    `  Mode    : ${DRY_RUN ? 'DRY RUN (aucune écriture)' : 'RÉEL'}`,
    `  Phase   : ${PHASE}`,
    `  Durée   : ${duration}s`,
    '═══════════════════════════════════════════════════',
    `  ProfilJeune`,
    `    créés             : ${stats.profils.created}`,
    `    déjà existants    : ${stats.profils.alreadyExists}`,
    `    non-mappés SSO    : ${stats.profils.notMapped}`,
    `    Utilisateur absent: ${stats.profils.utilisateurAbsent}`,
    `    erreurs           : ${stats.profils.errors}`,
    `    total Drupal      : ${stats.profils.total}`,
    `  Opportunités  : ${stats.opportunites.created} créées / ${stats.opportunites.alreadyExists} existantes / ${stats.opportunites.errors} err (${stats.opportunites.total} total)`,
    `  Événements    : ${stats.evenements.created} créés / ${stats.evenements.alreadyExists} existants / ${stats.evenements.errors} err (${stats.evenements.total} total)`,
    `  Ressources    : ${stats.ressources.created} créées / ${stats.ressources.alreadyExists} existantes / ${stats.ressources.errors} err (${stats.ressources.total} total)`,
    '═══════════════════════════════════════════════════',
  ]

  if (hasWarning) {
    lines.push(`  ⚠️  ${stats.profils.notMapped} non-mappés → npm run migrate:sso:create`)
    if (stats.profils.utilisateurAbsent > 0) {
      lines.push(`  ⚠️  ${stats.profils.utilisateurAbsent} Utilisateurs absents → npm run migrate:sso:sync`)
    }
    lines.push('═══════════════════════════════════════════════════')
  }

  if (totalErrors > 0) {
    lines.push(`  ❌ ${totalErrors} erreur(s) — vérifier les logs ci-dessus`)
    lines.push('═══════════════════════════════════════════════════')
  }

  const report = lines.join('\n')
  console.log(report)

  fs.mkdirSync('data', { recursive: true })
  const reportPath = path.join('data', `migration_report_${Date.now()}.txt`)
  fs.writeFileSync(reportPath, report)
  console.log(`\nRapport sauvegardé : ${reportPath}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startMs = Date.now()

  if (!DRUPAL_DB_URL)            throw new Error('DRUPAL_DB_URL manquant')
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant')

  console.log(`\nGuichet Jeunesse — Migration Drupal 8/9 → Prisma`)
  console.log(`Mode  : ${DRY_RUN ? 'DRY RUN' : 'RÉEL'} | Phase: ${PHASE}${LIMIT ? ` | Limit: ${LIMIT}` : ''}`)
  console.log('─────────────────────────────────────────────────')

  const maps    = loadSsoMaps()
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
  const prisma  = new PrismaClient({ adapter })
  const drupal  = await mysql.createConnection(DRUPAL_DB_URL)

  const stats: MigrationStats = {
    profils:      { total: 0, created: 0, alreadyExists: 0, notMapped: 0, utilisateurAbsent: 0, errors: 0 },
    opportunites: { total: 0, created: 0, alreadyExists: 0, errors: 0 },
    evenements:   { total: 0, created: 0, alreadyExists: 0, errors: 0 },
    ressources:   { total: 0, created: 0, alreadyExists: 0, errors: 0 },
  }

  try {
    if (!SKIP_PREFLIGHT) await preflight(prisma, maps)

    if (PHASE === 'all' || PHASE === 'profils')      await migrateProfilsJeune(drupal, prisma, maps, stats)
    if (PHASE === 'all' || PHASE === 'opportunites') await migrateOpportunites(drupal, prisma, stats)
    if (PHASE === 'all' || PHASE === 'evenements')   await migrateEvenements(drupal, prisma, stats)
    if (PHASE === 'all' || PHASE === 'ressources')   await migrateRessources(drupal, prisma, stats)
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
