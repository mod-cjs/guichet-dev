/**
 * GUIC-689 (vague 3, Lot G3) — code mort dans `src/components/dashboard/` :
 * `DashboardHero`, `DashboardCTACard`, `DashboardCompteurs`, `ActivityFeed`
 * (aucun call-site applicatif, seulement leur propre test/story) et
 * `DashboardTracker` (idem — sans lien réel avec `DashboardHero`, contrairement
 * à ce que sa JSDoc laissait entendre : vérifié par grep exhaustif, aucun
 * import croisé entre les deux fichiers).
 *
 * Sentinelle anti-résurrection : ces fichiers ne doivent plus exister, et le
 * barrel `index.ts` ne doit plus les exporter. `DashboardKPIs` (utilisé par
 * l'admin, hors périmètre de cette vague) et le reste du barrel v2/mock-data
 * restent intacts.
 */
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const DASHBOARD_DIR = path.join(ROOT, 'src/components/dashboard')

describe('src/components/dashboard/ — retrait du code mort (GUIC-689)', () => {
  const REMOVED_FILES = [
    'DashboardHero.tsx',
    'DashboardHero.stories.tsx',
    'DashboardCTACard.tsx',
    'DashboardCompteurs.tsx',
    'ActivityFeed.tsx',
    'DashboardTracker.tsx',
    'DashboardTracker.stories.tsx',
  ]

  it.each(REMOVED_FILES)('%s n\'existe plus', (file) => {
    expect(fs.existsSync(path.join(DASHBOARD_DIR, file))).toBe(false)
  })

  const REMOVED_TEST_FILES = [
    'tests/unit/dashboard-hero.test.tsx',
    'tests/unit/dashboard-tracker.test.tsx',
  ]

  it.each(REMOVED_TEST_FILES)('%s n\'existe plus (composant supprimé)', (relPath) => {
    expect(fs.existsSync(path.join(ROOT, relPath))).toBe(false)
  })

  it('le barrel index.ts ne réexporte plus aucun des composants retirés', () => {
    const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'index.ts'), 'utf-8')
    expect(content).not.toMatch(/\bDashboardHero\b/)
    expect(content).not.toMatch(/\bDashboardCTACard\b/)
    expect(content).not.toMatch(/\bDashboardCompteurs\b/)
    expect(content).not.toMatch(/\bActivityFeed\b/)
    expect(content).not.toMatch(/\bDashboardTracker\b/)
  })

  it('le barrel continue d\'exporter DashboardKPIs (utilisé par l\'admin, hors périmètre)', () => {
    const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'index.ts'), 'utf-8')
    expect(content).toMatch(/\bDashboardKPIs\b/)
    expect(fs.existsSync(path.join(DASHBOARD_DIR, 'DashboardKPIs.tsx'))).toBe(true)
  })
})
