#!/usr/bin/env node
/**
 * GUIC-346 — CLI exécutée par .githooks/pre-commit.
 *
 * Lit la liste des fichiers staged depuis git, applique les 2 règles
 * (`checkTddCompliance` et `checkConflictMarkers`) et retourne :
 *  - exit 0 si tout OK
 *  - exit 1 si une règle est violée (avec message d'erreur clair sur stderr)
 *
 * Bypass : `SKIP_TDD_CHECK=1` désactive uniquement la règle TDD
 * (les marqueurs de conflit restent toujours refusés — non négociable).
 *
 * Usage shell :
 *   npx tsx src/lib/githooks/cli-pre-commit.ts
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import {
  checkTddCompliance,
  checkConflictMarkers,
  type StagedFile,
} from './check-pre-commit'

/**
 * GUIC-698 — la branche porte-t-elle déjà un commit `test(...)` depuis sa divergence
 * d'avec l'intégration ? C'est ce qui autorise un commit GREEN de source seule.
 *
 * En cas de doute (base introuvable, dépôt sans `dev`, git indisponible) on répond `false` :
 * un garde-fou qui échoue doit refuser, jamais accorder.
 */
function redSurLaBranche(): boolean {
  for (const base of ['origin/dev', 'dev', 'origin/main', 'main']) {
    try {
      const point = execSync(`git merge-base HEAD ${base}`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
      if (!point) continue
      const sujets = execSync(`git log --format=%s ${point}..HEAD`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      return sujets
        .split('\n')
        .some((sujet) => /^test[(:]/.test(sujet.trim()))
    } catch {
      continue
    }
  }
  return false
}

function getStagedFiles(): StagedFile[] {
  const out = execSync('git diff --cached --name-status --diff-filter=AMRD', {
    encoding: 'utf-8',
  })
  return out
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      // Format : "A\tpath" ou "R100\told\tnew"
      const parts = line.split('\t')
      const status = parts[0][0] as StagedFile['status']
      const path = parts[parts.length - 1]
      return { path, status }
    })
}

function getStagedContent(path: string): string {
  try {
    // `git show :path` retourne le contenu staged (peut différer du worktree)
    return execSync(`git show :${JSON.stringify(path)}`, { encoding: 'utf-8' })
  } catch {
    try {
      return readFileSync(path, 'utf-8')
    } catch {
      return ''
    }
  }
}

function main() {
  const staged = getStagedFiles()
  if (staged.length === 0) {
    return 0
  }

  // Charger les contenus uniquement pour les fichiers staged texte (heuristique
  // par extension : on saute binaires connus).
  const TEXT_EXT = /\.(ts|tsx|js|jsx|json|md|css|scss|html|yaml|yml|txt|sh|prisma)$/
  const contents: Record<string, string> = {}
  for (const f of staged) {
    if (f.status === 'D') continue
    if (!TEXT_EXT.test(f.path)) continue
    contents[f.path] = getStagedContent(f.path)
  }

  // Règle 2 : marqueurs de conflit (toujours bloquant, pas de bypass)
  const conflictResult = checkConflictMarkers(
    Object.entries(contents).map(([path, content]) => ({ path, content })),
  )
  if (!conflictResult.ok) {
    process.stderr.write('\n❌ Marqueurs de conflit Git non résolus détectés :\n')
    for (const o of conflictResult.offenders) {
      process.stderr.write(`   ${o.path}:${o.line} (${o.marker})\n`)
    }
    process.stderr.write('\nRésous les conflits avant de commit. Bypass impossible.\n\n')
    return 1
  }

  // Règle 1 : TDD compliance (bypass possible via SKIP_TDD_CHECK=1)
  if (process.env.SKIP_TDD_CHECK === '1') {
    process.stderr.write('⚠ SKIP_TDD_CHECK=1 — vérification TDD désactivée (mode hot-fix)\n')
    return 0
  }

  const tddResult = checkTddCompliance(staged, contents, { redSurLaBranche: redSurLaBranche() })
  if (!tddResult.ok) {
    process.stderr.write('\n❌ Fichiers source modifiés sans test correspondant :\n')
    for (const p of tddResult.missing) {
      process.stderr.write(`   ${p}\n`)
    }
    process.stderr.write('\nAjoute un test dans tests/**/*.test.ts(x), ou commite d\'abord\n')
    process.stderr.write('le test RED : un commit `test(...)` sur la branche autorise ensuite\n')
    process.stderr.write('un commit GREEN de source seule (GUIC-698).\n')
    process.stderr.write('Bypass d\'urgence (loggué) : SKIP_TDD_CHECK=1 git commit ...\n\n')
    return 1
  }

  return 0
}

process.exit(main())
