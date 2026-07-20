/**
 * @jest-environment node
 *
 * GUIC-634 — Toute variable d'environnement lue par `src/` doit être documentée.
 *
 * POURQUOI CE TEST EXISTE : au moment de l'écrire, **25 des 59 variables** lues par le code
 * n'étaient documentées nulle part — dont `WHATSAPP_APP_SECRET` (sans elle, Meta désactive
 * l'abonnement et tout le canal entrant meurt), `SSO_WEBHOOK_SECRET` et `REDIS_KEY_PREFIX`.
 *
 * Une variable non documentée est une variable qu'on oublie au déploiement. Et les oublis les
 * plus coûteux sont **silencieux** : le service démarre, il a l'air sain, et une fonctionnalité
 * entière est morte.
 *
 * Documenter une fois ne suffit pas — l'écart se rouvre au prochain `process.env.X` ajouté. Ce
 * test transforme la documentation en INVARIANT : ajouter une lecture d'environnement sans la
 * documenter fait échouer la CI.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RACINE = process.cwd()

/**
 * Variables volontairement HORS du fichier d'environnement de déploiement.
 * Toute addition ici doit être justifiée — c'est une dérogation, pas une commodité.
 */
const DEROGATIONS = new Set([
  // Posée par Node et par Next, jamais par nous.
  'NODE_ENV',
  // Renseignée par Next lui-même pour distinguer les runtimes (nodejs / edge).
  'NEXT_RUNTIME',
  // Contournement du hook pre-commit (règle TDD) : outillage de développement, et surtout
  // à ne JAMAIS poser en production.
  'SKIP_TDD_CHECK',
  // Injectée automatiquement par Vercel côté serveur.
  'CRON_SECRET',
  // Positionnée par le harnais Playwright, jamais en production.
  'PLAYWRIGHT_SSO_MOCK',
  'PLAYWRIGHT_E2E_DB',
  'CI',
])

function fichiersSource(dossier: string, acc: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) {
      fichiersSource(chemin, acc)
    } else if (/\.(ts|tsx)$/.test(entree) && !/\.test\.(ts|tsx)$/.test(entree)) {
      acc.push(chemin)
    }
  }
  return acc
}

function variablesLues(): Set<string> {
  const trouvees = new Set<string>()
  for (const fichier of fichiersSource(join(RACINE, 'src'))) {
    const contenu = readFileSync(fichier, 'utf8')
    for (const m of contenu.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) {
      trouvees.add(m[1])
    }
  }
  return trouvees
}

function variablesDocumentees(): Set<string> {
  const contenu = readFileSync(join(RACINE, '.env.example'), 'utf8')
  const trouvees = new Set<string>()
  for (const m of contenu.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)) {
    trouvees.add(m[1])
  }
  return trouvees
}

describe('GUIC-634 — documentation des variables d’environnement', () => {
  it('toute variable lue par src/ figure dans .env.example', () => {
    const lues = variablesLues()
    const documentees = variablesDocumentees()

    const manquantes = [...lues].filter((v) => !documentees.has(v) && !DEROGATIONS.has(v)).sort()

    // Message actionnable : la liste exacte, et quoi en faire.
    expect(manquantes).toEqual([])
  })

  it('le test lit bien la réalité (garde-fou anti-faux-vert)', () => {
    // Si les deux extractions renvoyaient du vide, le test précédent passerait sans rien
    // vérifier. On fixe des repères qui existent des deux côtés.
    const lues = variablesLues()
    const documentees = variablesDocumentees()

    expect(lues.size).toBeGreaterThan(40)
    expect(documentees.size).toBeGreaterThan(40)
    expect(lues.has('DATABASE_URL')).toBe(true)
    expect(documentees.has('DATABASE_URL')).toBe(true)
    // Variable ajoutée par GUIC-634 : sa présence prouve que la section documentée est lue.
    expect(documentees.has('WHATSAPP_APP_SECRET')).toBe(true)
  })

  it('les dérogations sont justifiées et bornées', () => {
    // Une liste de dérogations qui enfle vide le test de son sens.
    expect(DEROGATIONS.size).toBeLessThanOrEqual(10)
  })
})
