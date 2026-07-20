#!/usr/bin/env node
/**
 * GUIC-604 — Garde-fou de couverture E2E : aucun test ne doit être SKIPPÉ en CI.
 *
 * Pourquoi : les 6 skips des specs sont tous pilotés par `PLAYWRIGHT_SSO_MOCK` /
 * `PLAYWRIGHT_E2E_DB`. Si une gate est perdue (env oubliée, mock SSO non démarré), les parcours
 * métier redeviennent skippés et le job passe VERT en ne testant que l'auth/routing — un
 * faux-vert de couverture, exactement la classe de problème de C-CD1.
 *
 * Lit le rapport JSON de Playwright (parser le HTML serait fragile : SPA à données encodées).
 * Usage : node scripts/ci/assert-no-skipped-e2e.mjs playwright-results.json
 */
import { readFileSync, existsSync } from 'node:fs'

const fichier = process.argv[2] ?? 'playwright-results.json'

if (!existsSync(fichier)) {
  console.error(`::error::Rapport Playwright introuvable : ${fichier} (les tests ont-ils tourné ?)`)
  process.exit(1)
}

const rapport = JSON.parse(readFileSync(fichier, 'utf8'))

/** Parcourt l'arbre suites → specs et collecte les tests skippés. */
const skipped = []
let total = 0

function visiterSuite(suite) {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      total += 1
      // Playwright marque `status: 'skipped'` sur le test, et/ou les résultats.
      const statuts = [t.status, ...(t.results ?? []).map((r) => r.status)]
      if (statuts.includes('skipped')) {
        skipped.push(`${suite.title ? suite.title + ' › ' : ''}${spec.title}`)
      }
    }
  }
  for (const s of suite.suites ?? []) visiterSuite(s)
}

for (const suite of rapport.suites ?? []) visiterSuite(suite)

if (total === 0) {
  console.error('::error::Aucun test E2E exécuté — couverture nulle.')
  process.exit(1)
}

if (skipped.length > 0) {
  console.error(`::error::${skipped.length} test(s) E2E SKIPPÉ(S) alors que les gates sont actives :`)
  for (const t of skipped) console.error(`  - ${t}`)
  console.error('Vérifier PLAYWRIGHT_SSO_MOCK=1, PLAYWRIGHT_E2E_DB=1 et le démarrage du SSO mock.')
  process.exit(1)
}

console.log(`✓ ${total} tests E2E exécutés, aucun skippé.`)
