/**
 * Synchronisation Utilisateurs SSO → Guichet (prérequis migrate-drupal.ts)
 * GUIC-17 — M1
 *
 * Lit la base SSO (LECTURE SEULE) et upsert en masse dans utilisateurs.
 * Source de vérité : SSO CJS — ne jamais écrire les Utilisateurs depuis Drupal.
 *
 * PRÉREQUIS
 * ---------
 *   SSO_DB_URL   = mysql://user:pass@host:3306/auth_database
 *   DATABASE_URL = mysql://user:pass@host:3306/guichet_jeunesse
 *
 * EXÉCUTION
 * ---------
 *   npx tsx scripts/sync-utilisateurs-sso.ts [--dry-run] [--limit=N]
 *
 * RÉSULTAT
 * --------
 *   Upsert en masse des Utilisateur en DB Guichet.
 *   Les enregistrements existants sont mis à jour uniquement sur les champs
 *   non-sensibles (téléphone, région, drupalUid) — jamais nom/prénom écrasés.
 */

import { PrismaClient }       from '@prisma/client'
import { PrismaMariaDb }      from '@prisma/adapter-mariadb'
import * as mysql             from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN     = process.argv.includes('--dry-run')
const LIMIT       = (() => { const m = process.argv.find(a => a.startsWith('--limit=')); return m ? parseInt(m.split('=')[1]) : undefined })()
const SSO_DB_URL  = process.env.SSO_DB_URL
const CHUNK_SIZE  = 200

// ─── Types ────────────────────────────────────────────────────────────────────

interface SsoUser extends RowDataPacket {
  uuid:       string
  email:      string | null
  phone:      string | null
  first_name: string | null
  last_name:  string | null
  gender:     'M' | 'F' | 'other' | null
  date_of_birth: string | null
  region:     string | null
  commune:    string | null
  drupal_uid: number | null
  status:     'active' | 'inactive' | 'suspended' | 'pending'
  created_at: string | null
}

interface SyncStats {
  total:    number
  created:  number
  updated:  number
  skipped:  number
  errors:   number
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

const REGION_MAP: Record<string, string> = {
  'dakar': 'Dakar', 'thiès': 'Thies', 'thies': 'Thies', 'diourbel': 'Diourbel',
  'fatick': 'Fatick', 'kaolack': 'Kaolack', 'kaffrine': 'Kaffrine', 'louga': 'Louga',
  'saint-louis': 'Saint_Louis', 'saint_louis': 'Saint_Louis', 'matam': 'Matam',
  'tambacounda': 'Tambacounda', 'kédougou': 'Kedougou', 'kedougou': 'Kedougou',
  'kolda': 'Kolda', 'ziguinchor': 'Ziguinchor', 'sédhiou': 'Sedhiou', 'sedhiou': 'Sedhiou',
}

function mapRegion(val: string | null): string | null {
  if (!val) return null
  return REGION_MAP[val.toLowerCase()] ?? REGION_MAP[val] ?? null
}

function mapStatut(status: SsoUser['status']): 'actif' | 'inactif' {
  return (status === 'active' || status === 'pending') ? 'actif' : 'inactif'
}

function nomFallback(last: string | null, email: string | null): string {
  if (last?.trim()) return last.trim()
  return email?.split('@')[0] ?? 'Inconnu'
}

function prenomFallback(first: string | null, email: string | null): string {
  if (first?.trim()) return first.trim()
  return email?.split('@')[0] ?? 'Inconnu'
}

// ─── Traitement par chunks ────────────────────────────────────────────────────

async function processChunk(
  prisma: PrismaClient,
  chunk: SsoUser[],
  existingUids: Set<string>,
  stats: SyncStats,
) {
  const toCreate = chunk.filter(u => !existingUids.has(u.uuid))
  const toUpdate = chunk.filter(u => existingUids.has(u.uuid))

  // Créations en masse
  if (toCreate.length > 0 && !DRY_RUN) {
    const data = toCreate.map(u => ({
      cjsUid:            u.uuid,
      email:             u.email?.trim().toLowerCase() ?? null,
      telephone:         u.phone?.trim() ?? null,
      nom:               nomFallback(u.last_name, u.email).slice(0, 100),
      prenom:            prenomFallback(u.first_name, u.email).slice(0, 100),
      region:            mapRegion(u.region) as any ?? null,
      genre:             (u.gender === 'M' || u.gender === 'F') ? u.gender as any : null,
      dateNaissance:     u.date_of_birth ? new Date(u.date_of_birth) : null,
      statut:            mapStatut(u.status) as any,
      commune:           u.commune ?? null,
      drupalUid:         u.drupal_uid ?? null,
      createdAt:         u.created_at ? new Date(u.created_at) : new Date(),
    }))
    try {
      const result = await prisma.utilisateur.createMany({ data, skipDuplicates: true })
      stats.created += result.count
    } catch (err) {
      console.error(`  [ERR] createMany chunk:`, (err as Error).message)
      stats.errors += toCreate.length
    }
  } else {
    stats.created += toCreate.length // dry-run : compter comme créés
  }

  // Mises à jour ciblées (drupalUid + téléphone uniquement — ne pas écraser nom/prénom SSO)
  if (!DRY_RUN) {
    for (const u of toUpdate) {
      try {
        await prisma.utilisateur.update({
          where: { cjsUid: u.uuid },
          data: {
            ...(u.drupal_uid != null ? { drupalUid: u.drupal_uid } : {}),
            ...(u.phone       ? { telephone: u.phone.trim() }     : {}),
            ...(u.region      ? { region: mapRegion(u.region) as any } : {}),
          },
        })
        stats.updated++
      } catch (err) {
        // Conflit unique téléphone → ignorer (autre compte a déjà ce numéro)
        const msg = (err as Error).message
        if (msg.includes('Unique constraint') || msg.includes('unique')) {
          stats.skipped++
        } else {
          console.error(`  [ERR] update ${u.uuid}:`, msg)
          stats.errors++
        }
      }
    }
  } else {
    stats.updated += toUpdate.length
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startMs = Date.now()

  if (!SSO_DB_URL)            throw new Error('SSO_DB_URL manquant')
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant')

  console.log('\nGuichet Jeunesse — Sync Utilisateurs SSO → DB')
  console.log(`Mode  : ${DRY_RUN ? 'DRY RUN (aucune écriture)' : 'RÉEL'}${LIMIT ? ` | Limit: ${LIMIT}` : ''}`)
  console.log('─────────────────────────────────────────────────')

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
  const prisma  = new PrismaClient({ adapter })
  const sso     = await mysql.createConnection(SSO_DB_URL)

  const stats: SyncStats = { total: 0, created: 0, updated: 0, skipped: 0, errors: 0 }

  try {
    // Charger tous les cjsUid déjà en base (une seule requête)
    const existing = await prisma.utilisateur.findMany({ select: { cjsUid: true } })
    const existingUids = new Set(existing.map(u => u.cjsUid))
    console.log(`Utilisateurs déjà en DB Guichet : ${existingUids.size}`)

    // Lire tous les utilisateurs SSO actifs
    const [ssoUsers] = await sso.query<SsoUser[]>(
      `SELECT uuid, email, phone, first_name, last_name, gender,
              date_of_birth, region, commune, drupal_uid, status, created_at
       FROM users
       WHERE deleted_at IS NULL
       ${LIMIT ? `LIMIT ${LIMIT}` : ''}`
    )
    await sso.end()

    stats.total = ssoUsers.length
    console.log(`Utilisateurs SSO : ${ssoUsers.length}`)
    console.log(`À créer          : ${ssoUsers.filter(u => !existingUids.has(u.uuid)).length}`)
    console.log(`À mettre à jour  : ${ssoUsers.filter(u => existingUids.has(u.uuid)).length}`)
    console.log('')

    // Traitement par chunks
    for (let i = 0; i < ssoUsers.length; i += CHUNK_SIZE) {
      const chunk = ssoUsers.slice(i, i + CHUNK_SIZE)
      await processChunk(prisma, chunk, existingUids, stats)
      process.stdout.write(`\r  Progression : ${Math.min(i + CHUNK_SIZE, ssoUsers.length)} / ${ssoUsers.length}`)
    }
    console.log('')

  } finally {
    await prisma.$disconnect()
    const duration = ((Date.now() - startMs) / 1000).toFixed(1)
    console.log('\n═══════════════════════════════════════════════════')
    console.log('  SYNC UTILISATEURS SSO — GUIC-17')
    console.log(`  Mode    : ${DRY_RUN ? 'DRY RUN' : 'RÉEL'}`)
    console.log(`  Durée   : ${duration}s`)
    console.log('═══════════════════════════════════════════════════')
    console.log(`  Total SSO      : ${stats.total}`)
    console.log(`  Créés          : ${stats.created}`)
    console.log(`  Mis à jour     : ${stats.updated}`)
    console.log(`  Skippés        : ${stats.skipped} (conflit téléphone unique)`)
    console.log(`  Erreurs        : ${stats.errors}`)
    console.log('═══════════════════════════════════════════════════')
    if (!DRY_RUN && stats.errors === 0) {
      console.log('\nProchaine étape : npm run migrate:drupal:dry-run')
    }
  }
}

main().catch(err => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})
