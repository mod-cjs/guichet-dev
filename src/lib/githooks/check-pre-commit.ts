/**
 * GUIC-346 — Helpers du hook pre-commit.
 *
 * Exposé pour permettre des tests unitaires isolés (le shell appelle ces
 * helpers via `npx tsx` plutôt que d'implémenter la logique en pur bash).
 *
 * 2 règles :
 *  1. "no source without test" — refuse les fichiers `src/**\/*.ts(x)`
 *     staged sans test `tests/**\/*.test.ts(x)` également staged.
 *  2. "no conflict markers" — refuse les fichiers staged contenant
 *     des marqueurs `<<<<<<<`, `=======`, `>>>>>>>` non résolus.
 *
 * Bypass règle 1 : `SKIP_TDD_CHECK=1` (loggué, pour hot-fix urgent).
 * Bypass règle 2 : aucun (jamais commit avec marqueur).
 */

export interface StagedFile {
  /** Chemin relatif au repo root (ex: `src/lib/foo.ts`). */
  path: string
  /** Status git diff --name-status : A=Added, M=Modified, D=Deleted, R=Renamed. */
  status: 'A' | 'M' | 'D' | 'R'
}

export interface TddCheckResult {
  ok: boolean
  /** Fichiers source modifiés/ajoutés sans test correspondant. */
  missing: string[]
}

export interface ConflictCheckResult {
  ok: boolean
  offenders: { path: string; line: number; marker: string }[]
}

/** Détecte si un fichier est un test (`tests/**\/*.test.ts(x)`). */
function isTestFile(path: string): boolean {
  return /^tests\/.+\.test\.(ts|tsx)$/.test(path)
}

/** Détecte si un fichier source est exempté (Storybook, types, re-export trivial). */
export function isExempt(path: string, content?: string): boolean {
  // Storybook stories
  if (path.endsWith('.stories.tsx') || path.endsWith('.stories.ts')) return true
  // Déclarations de types pures
  if (path.endsWith('.d.ts')) return true
  // CSS pur
  if (path.startsWith('src/styles/')) return true
  // Layouts simples (heuristique : pas de logique métier, juste structure)
  if (path.match(/^src\/app\/.+\/layout\.tsx$/)) return true
  // Re-export trivial : `index.ts(x)` < 20 lignes contenant seulement
  // des `export ... from` (peut être déterminé si content fourni).
  if (path.match(/\/index\.(ts|tsx)$/) && content) {
    const lines = content.split('\n').filter((l) => l.trim() && !l.trim().startsWith('//'))
    if (lines.length < 20 && lines.every((l) => /^(export\s|import\s)/.test(l.trim()))) {
      return true
    }
  }
  return false
}

/** Détecte si un fichier source code (`src/**\/*.ts(x)`) requiert un test. */
function isSourceFile(path: string): boolean {
  return /^src\/.+\.(ts|tsx)$/.test(path)
}

/**
 * Règle 1 : si au moins un fichier source non-exempté est staged, au moins
 * un fichier test doit aussi être staged. Granularité simple (pas
 * de mapping 1:1 source→test) pour éviter les faux positifs sur les
 * refactors qui touchent plusieurs fichiers couverts par un seul test.
 */
/** Contexte de branche — voir GUIC-698. Comportement non encore implémenté. */
export interface TddOptions {
  /** Vrai si la branche porte déjà un commit `test(...)` depuis sa divergence d'avec `dev`. */
  redSurLaBranche?: boolean
}

export function checkTddCompliance(
  files: StagedFile[],
  fileContents: Record<string, string> = {},
  options: TddOptions = {},
): TddCheckResult {
  void options
  const sourceFiles = files
    .filter((f) => f.status === 'A' || f.status === 'M')
    .filter((f) => isSourceFile(f.path))
    .filter((f) => !isExempt(f.path, fileContents[f.path]))

  if (sourceFiles.length === 0) return { ok: true, missing: [] }

  const hasTestStaged = files.some(
    (f) => (f.status === 'A' || f.status === 'M') && isTestFile(f.path),
  )

  if (hasTestStaged) return { ok: true, missing: [] }

  return { ok: false, missing: sourceFiles.map((f) => f.path) }
}

/**
 * Règle 2 : détecte les marqueurs de conflit Git non résolus dans le
 * contenu de chaque fichier staged. Patterns reconnus :
 *  - ligne commençant par `<<<<<<<` (au moins 7 chevrons)
 *  - ligne `========` exactement (au moins 7 signes égal, ligne entière)
 *  - ligne commençant par `>>>>>>>` (au moins 7 chevrons)
 *
 * Note : on évite les faux positifs sur les strings littérales en
 * exigeant que la ligne **commence** par le marqueur (les markdown
 * tables ou ASCII art peuvent contenir `========` mais pas en début
 * de ligne avec rien d'autre).
 */
export function checkConflictMarkers(
  files: { path: string; content: string }[],
): ConflictCheckResult {
  const offenders: ConflictCheckResult['offenders'] = []
  const startMarker = /^<{7,}/
  const endMarker = /^>{7,}/
  const sepMarker = /^={7,}\s*$/

  for (const f of files) {
    const lines = f.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (startMarker.test(l)) offenders.push({ path: f.path, line: i + 1, marker: 'start' })
      else if (endMarker.test(l)) offenders.push({ path: f.path, line: i + 1, marker: 'end' })
      else if (sepMarker.test(l)) offenders.push({ path: f.path, line: i + 1, marker: 'sep' })
    }
  }

  return { ok: offenders.length === 0, offenders }
}
