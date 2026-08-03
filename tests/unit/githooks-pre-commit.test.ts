/**
 * @jest-environment node
 *
 * GUIC-346 — Tests des helpers du hook pre-commit.
 *
 * 2 règles testées :
 *  1. "no source without test"
 *  2. "no conflict markers"
 */

import {
  checkTddCompliance,
  checkConflictMarkers,
  isExempt,
  type StagedFile,
} from '@/lib/githooks/check-pre-commit'

describe('GUIC-346 — checkTddCompliance (no source without test)', () => {
  it('refuse commit avec src/foo.ts sans test', () => {
    const files: StagedFile[] = [{ path: 'src/lib/foo.ts', status: 'A' }]
    const result = checkTddCompliance(files)
    expect(result.ok).toBe(false)
    expect(result.missing).toContain('src/lib/foo.ts')
  })

  it('autorise commit avec src/foo.ts + tests/unit/foo.test.ts', () => {
    const files: StagedFile[] = [
      { path: 'src/lib/foo.ts', status: 'A' },
      { path: 'tests/unit/foo.test.ts', status: 'A' },
    ]
    expect(checkTddCompliance(files).ok).toBe(true)
  })

  it('autorise modification src/foo.ts si tests/foo.test.ts aussi modifié', () => {
    const files: StagedFile[] = [
      { path: 'src/lib/foo.ts', status: 'M' },
      { path: 'tests/integration/foo.test.ts', status: 'M' },
    ]
    expect(checkTddCompliance(files).ok).toBe(true)
  })

  it('exception : src/components/Foo.stories.tsx seul → OK', () => {
    const files: StagedFile[] = [{ path: 'src/components/Foo.stories.tsx', status: 'A' }]
    expect(checkTddCompliance(files).ok).toBe(true)
  })

  it('exception : src/types/api.d.ts seul → OK', () => {
    const files: StagedFile[] = [{ path: 'src/types/api.d.ts', status: 'M' }]
    expect(checkTddCompliance(files).ok).toBe(true)
  })

  it('exception : src/styles/tokens.css → géré (mais .css non vérifié par cette règle)', () => {
    // .css ne match pas isSourceFile (qui ne couvre que .ts/.tsx), donc auto-OK.
    const files: StagedFile[] = [{ path: 'src/styles/tokens.css', status: 'M' }]
    expect(checkTddCompliance(files).ok).toBe(true)
  })

  it('exception : src/app/jeune/(app)/layout.tsx seul → OK', () => {
    const files: StagedFile[] = [{ path: 'src/app/jeune/(app)/layout.tsx', status: 'M' }]
    expect(checkTddCompliance(files).ok).toBe(true)
  })

  it('exception : src/components/ui/index.ts re-export trivial → OK', () => {
    const files: StagedFile[] = [{ path: 'src/components/ui/index.ts', status: 'M' }]
    const contents = {
      'src/components/ui/index.ts':
        "export { Button } from './Button'\nexport { Card } from './Card'\nexport * from './types'\n",
    }
    expect(checkTddCompliance(files, contents).ok).toBe(true)
  })

  it('PAS exception : src/components/ui/index.ts avec logique → bloqué', () => {
    const files: StagedFile[] = [{ path: 'src/components/ui/index.ts', status: 'M' }]
    const contents = {
      'src/components/ui/index.ts':
        "export function foo() {\n  const x = 1\n  return x + 2\n}\n",
    }
    expect(checkTddCompliance(files, contents).ok).toBe(false)
  })

  it('détecte plusieurs fichiers source sans test', () => {
    const files: StagedFile[] = [
      { path: 'src/lib/a.ts', status: 'A' },
      { path: 'src/lib/b.ts', status: 'A' },
    ]
    const result = checkTddCompliance(files)
    expect(result.ok).toBe(false)
    expect(result.missing).toHaveLength(2)
  })

  it('ignore les fichiers supprimés (status D)', () => {
    const files: StagedFile[] = [{ path: 'src/lib/old.ts', status: 'D' }]
    expect(checkTddCompliance(files).ok).toBe(true)
  })
})

describe('GUIC-346 — checkConflictMarkers', () => {
  it('refuse fichier contenant <<<<<<< HEAD', () => {
    const files = [{ path: 'src/foo.ts', content: 'import x\n<<<<<<< HEAD\nfoo\n' }]
    const result = checkConflictMarkers(files)
    expect(result.ok).toBe(false)
    expect(result.offenders).toHaveLength(1)
    expect(result.offenders[0].marker).toBe('start')
  })

  it('refuse fichier contenant ======= sur ligne entière', () => {
    const files = [{ path: 'src/foo.ts', content: 'x\n=======\ny\n' }]
    expect(checkConflictMarkers(files).ok).toBe(false)
  })

  it('refuse fichier contenant >>>>>>> branch', () => {
    const files = [{ path: 'src/foo.ts', content: 'x\n>>>>>>> origin/dev\n' }]
    expect(checkConflictMarkers(files).ok).toBe(false)
  })

  it('autorise contenu sans marqueur', () => {
    const files = [{ path: 'src/foo.ts', content: 'export const x = 1\n' }]
    expect(checkConflictMarkers(files).ok).toBe(true)
  })

  it('autorise ASCII art markdown avec == inline mais pas en début de ligne', () => {
    const files = [{ path: 'docs/x.md', content: '| col1 | col2 |\n|======|------|\nz\n' }]
    // ' |====' commence par espace + pipe, pas par 7 signes égal
    expect(checkConflictMarkers(files).ok).toBe(true)
  })

  it('détecte plusieurs marqueurs dans un même fichier', () => {
    const files = [
      {
        path: 'src/foo.ts',
        content: '<<<<<<< HEAD\nA\n=======\nB\n>>>>>>> branch\n',
      },
    ]
    const result = checkConflictMarkers(files)
    expect(result.ok).toBe(false)
    expect(result.offenders).toHaveLength(3)
    expect(result.offenders.map((o) => o.marker)).toEqual(['start', 'sep', 'end'])
  })

  it('détecte marqueurs sur plusieurs fichiers', () => {
    const files = [
      { path: 'src/a.ts', content: '<<<<<<< HEAD\n' },
      { path: 'src/b.ts', content: 'OK\n' },
      { path: 'src/c.ts', content: '>>>>>>> ok\n' },
    ]
    const result = checkConflictMarkers(files)
    expect(result.ok).toBe(false)
    expect(result.offenders.map((o) => o.path).sort()).toEqual(['src/a.ts', 'src/c.ts'])
  })
})

describe('GUIC-346 — isExempt', () => {
  it.each([
    ['src/components/Button.stories.tsx', true],
    ['src/types/api.d.ts', true],
    ['src/styles/tokens.css', true],  // exempt explicite (styles purs)
    ['src/app/jeune/(app)/layout.tsx', true],
    ['src/lib/utils.ts', false],
  ])('isExempt(%s) === %s', (path, expected) => {
    expect(isExempt(path)).toBe(expected)
  })
})

describe('GUIC-698 — un commit GREEN de source seule reste possible après un RED', () => {
  /**
   * La convention TDD du projet impose deux commits : `test(...)` RED d'abord, puis
   * `feat|fix(...)` GREEN qui ne contient QUE de la source. La règle 1 de GUIC-346, qui
   * exige un test staged dans le même commit, rend donc tout GREEN conforme impossible —
   * et le bypass devient la norme, ce qui vide le garde-fou de sa substance.
   *
   * La règle devient : on autorise un commit de source seule lorsque la branche porte déjà
   * un commit `test(...)` depuis sa divergence d'avec `dev`. La contrainte reste réelle
   * (il faut avoir écrit un test sur la branche), mais elle cesse de contredire la
   * convention qu'elle sert.
   */
  const sourceSeule: StagedFile[] = [{ path: 'src/lib/datahub/tap-manifest.ts', status: 'M' }]

  it('autorise la source seule quand un commit test existe sur la branche', () => {
    expect(checkTddCompliance(sourceSeule, {}, { redSurLaBranche: true }).ok).toBe(true)
  })

  it('refuse toujours la source seule quand la branche ne porte aucun commit test', () => {
    const result = checkTddCompliance(sourceSeule, {}, { redSurLaBranche: false })
    expect(result.ok).toBe(false)
    expect(result.missing).toContain('src/lib/datahub/tap-manifest.ts')
  })

  it('refuse par défaut, en l\'absence d\'information sur la branche', () => {
    expect(checkTddCompliance(sourceSeule).ok).toBe(false)
  })
})
