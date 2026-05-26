/**
 * Orchestrateur migration Drupal → Guichet (GUIC-17)
 *
 * Enchaîne les 5 phases avec pre-flight, dry-run, resume et rapport JSON consolidé.
 * Toutes les écritures côté SSO passent par l'API (POST /users/provision/bulk +
 * PATCH /users/{uuid}) — aucun SQL manuel sur le serveur SSO.
 *
 * USAGE
 * -----
 *   npm run migrate:all -- [--dry-run] [--resume-from=<phase>] [--only=<phase>]
 *
 *   Phases : extract-map · create-sso · sync-utilisateurs · migrate-drupal · backfill-phones
 *
 * VARIABLES REQUISES (voir docs/migration-drupal.md)
 *   DRUPAL_DB_URL      = mysql://... (lecture seule)
 *   SSO_DB_URL         = mysql://... (lecture seule, pour sync-utilisateurs)
 *   DATABASE_URL       = mysql://... (cible Guichet)
 *   SSO_BASE_URL       = https://sso.cjs.sn
 *   SSO_API_KEY        = clé HMAC
 *   SSO_API_SECRET     = secret HMAC
 *   SSO_ADMIN_TOKEN    = Bearer token Passport scope admin
 *   SSO_DUMP_FILE      = chemin vers auth_database.sql (pour extract-map)
 */

import { spawn } from 'node:child_process'
import * as fs   from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'

import {
  ALL_PHASES,
  phasesToRun,
  buildFinalReport,
  type PhaseName,
  type PhaseReport,
} from '../src/lib/migration/orchestrator'

// ─── Arguments ───────────────────────────────────────────────────────────────

const DRY_RUN     = process.argv.includes('--dry-run')
const RESUME_FROM = argValue('--resume-from')
const ONLY        = argValue('--only')
const NO_PROMPT   = process.argv.includes('--yes')

function argValue(flag: string): string | undefined {
  const arg = process.argv.find(a => a.startsWith(`${flag}=`))
  return arg ? arg.split('=')[1] : undefined
}

const IMPORT_BATCH = process.env.IMPORT_BATCH ?? `migration-${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(3).toString('hex')}`

// ─── Pre-flight ──────────────────────────────────────────────────────────────

const REQUIRED_ENV_BY_PHASE: Record<PhaseName, string[]> = {
  'extract-map':       ['SSO_DUMP_FILE'],
  'create-sso':        ['DRUPAL_DB_URL', 'SSO_BASE_URL', 'SSO_API_KEY', 'SSO_API_SECRET', 'SSO_ADMIN_TOKEN'],
  'sync-utilisateurs': ['SSO_DB_URL', 'DATABASE_URL'],
  'migrate-drupal':    ['DRUPAL_DB_URL', 'DATABASE_URL'],
  'backfill-phones':   ['DRUPAL_DB_URL', 'SSO_BASE_URL', 'SSO_API_KEY', 'SSO_API_SECRET', 'SSO_ADMIN_TOKEN'],
}

function preflight(phases: PhaseName[]): void {
  console.log('Pre-flight :')
  const missing = new Set<string>()
  for (const p of phases) {
    for (const v of REQUIRED_ENV_BY_PHASE[p]) {
      if (!process.env[v]) missing.add(v)
    }
  }
  if (missing.size > 0) {
    console.error(`  ❌ Variables d'environnement manquantes : ${[...missing].join(', ')}`)
    process.exit(2)
  }
  console.log('  ✓ Toutes les variables d\'environnement requises sont présentes')
  console.log(`  ✓ Import batch : ${IMPORT_BATCH}`)
}

// ─── Exécution d'une phase ───────────────────────────────────────────────────

const PHASE_COMMANDS: Record<PhaseName, (dry: boolean) => { cmd: string; args: string[] }> = {
  'extract-map': () => ({
    cmd:  'python3',
    args: ['scripts/extract-sso-map.py', requireEnv('SSO_DUMP_FILE')],
  }),
  'create-sso': dry => ({
    cmd:  'npx',
    args: ['tsx', 'scripts/create-sso-accounts.ts', ...(dry ? ['--dry-run'] : [])],
  }),
  'sync-utilisateurs': dry => ({
    cmd:  'npx',
    args: ['tsx', 'scripts/sync-utilisateurs-sso.ts', ...(dry ? ['--dry-run'] : [])],
  }),
  'migrate-drupal': dry => ({
    cmd:  'npx',
    args: ['tsx', 'scripts/migrate-drupal.ts', ...(dry ? ['--dry-run'] : [])],
  }),
  'backfill-phones': dry => ({
    cmd:  'npx',
    args: ['tsx', 'scripts/backfill-sso-phones.ts', ...(dry ? ['--dry-run'] : [])],
  }),
}

function runPhase(phase: PhaseName): Promise<PhaseReport> {
  const { cmd, args } = PHASE_COMMANDS[phase](DRY_RUN)
  console.log(`\n━━ ${phase.toUpperCase()} ━━`)
  console.log(`$ ${cmd} ${args.join(' ')}`)
  const start = Date.now()

  return new Promise(resolve => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env:   { ...process.env, IMPORT_BATCH },
    })
    child.on('close', code => {
      const durationMs = Date.now() - start
      if (code === 0) {
        resolve({ phase, status: 'ok', durationMs, counters: {} })
      } else {
        resolve({
          phase, status: 'failed', durationMs, counters: {},
          error: `exit code ${code}`,
        })
      }
    })
  })
}

// ─── Confirmation interactive ────────────────────────────────────────────────

async function confirm(question: string): Promise<boolean> {
  if (NO_PROMPT) return true
  process.stdout.write(`${question} [y/N] `)
  for await (const chunk of process.stdin) {
    const ans = chunk.toString().trim().toLowerCase()
    return ans === 'y' || ans === 'yes' || ans === 'o' || ans === 'oui'
  }
  return false
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const phases = phasesToRun({ resumeFrom: RESUME_FROM, only: ONLY })

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║  Migration Drupal → Guichet — Orchestrateur (GUIC-17)        ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(`Mode    : ${DRY_RUN ? 'DRY RUN (aucune écriture)' : 'RÉEL'}`)
  console.log(`Phases  : ${phases.join(' → ')}`)
  console.log(`Batch   : ${IMPORT_BATCH}`)
  console.log('')

  preflight(phases)

  if (!DRY_RUN) {
    const ok = await confirm('\nLancer la migration RÉELLE (écritures Guichet + SSO) ?')
    if (!ok) { console.log('Annulé.'); process.exit(0) }
  }

  const reports: PhaseReport[] = []
  for (const phase of phases) {
    const report = await runPhase(phase)
    reports.push(report)
    if (report.status === 'failed') {
      console.error(`\n❌ Phase ${phase} échouée (${report.error}) — orchestrateur stoppé.`)
      console.error(`   Reprendre avec : npm run migrate:all -- --resume-from=${phase}`)
      break
    }
  }

  // Rapport final
  const final     = buildFinalReport(reports, IMPORT_BATCH)
  fs.mkdirSync('data', { recursive: true })
  const reportPath = path.join('data', `migrate_all_report_${IMPORT_BATCH}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(final, null, 2), 'utf-8')

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║  RAPPORT FINAL                                               ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  for (const r of final.phases) {
    const icon = r.status === 'ok' ? '✓' : r.status === 'failed' ? '✗' : '—'
    console.log(`  ${icon} ${r.phase.padEnd(20)} ${(r.durationMs / 1000).toFixed(1)}s  ${r.error ?? ''}`)
  }
  console.log(`\nDurée totale : ${(final.global.total_duration_ms / 1000).toFixed(1)}s`)
  console.log(`Rapport      : ${reportPath}`)

  if (final.global.has_errors) process.exit(1)
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
