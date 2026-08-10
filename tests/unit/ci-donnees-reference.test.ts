/**
 * @jest-environment node
 *
 * GUIC-674 — La CI doit fournir les données de RÉFÉRENCE avant de lancer les tests.
 *
 * Panne réelle (run 31393049537 sur `dev`) : 30 échecs, une seule cause —
 * `ProgrammeInconnuError: PROGRAMME_INCONNU: yeah | yjc | yaakaar | edupop`.
 *
 * Le workflow monte une base VIERGE (sentinelle prod GUIC-563), applique
 * `prisma migrate deploy`… puis lance `npm run test`. La table `programmes`
 * reste donc vide. Or GUIC-684 a rendu le rattachement à un programme
 * OBLIGATOIRE : toute création de ressource ou d'opportunité lève.
 *
 * Pourquoi personne ne l'a vu : nos bases de développement ont été semées une
 * fois à la main, il y a des mois. La suite était verte par chance — elle
 * dépendait d'un état ambiant que rien ne recrée. Une base vierge est la seule
 * qui dise la vérité.
 *
 * Les quatre programmes ne sont pas des fixtures de test : c'est de la donnée
 * de référence métier, au même titre qu'une liste de régions. Les fournir n'est
 * pas maquiller un échec.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { PROGRAMMES_SEED } from '../../prisma/seed/programmes'

const RACINE = process.cwd()
const CI = readFileSync(resolve(RACINE, '.github/workflows/ci.yml'), 'utf-8')

/** Chemins absolus de tous les `*.test.ts` sous un dossier, récursivement. */
function fichiersTests(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name)
    if (e.isDirectory()) return fichiersTests(chemin)
    return e.name.endsWith('.test.ts') ? [chemin] : []
  })
}

/** Numéro de ligne de la première ligne `run:` satisfaisant le motif. */
function ligneDuRun(motif: RegExp): number {
  const lignes = CI.split('\n')
  const i = lignes.findIndex((l) => /^\s*run:/.test(l) && motif.test(l))
  // Un `run: |` multiligne porte la commande en dessous : on élargit au bloc.
  if (i !== -1) return i
  return lignes.findIndex((l) => motif.test(l) && !/^\s*#/.test(l))
}

describe('GUIC-674 — la CI amorce les données de référence', () => {
  it('un pas d’amorçage existe dans le workflow', () => {
    expect(ligneDuRun(/seed\/reference/)).toBeGreaterThan(-1)
  })

  it('il s’exécute APRÈS la migration — le schéma doit exister', () => {
    const migration = ligneDuRun(/prisma migrate deploy/)
    const amorce = ligneDuRun(/seed\/reference/)
    expect(migration).toBeGreaterThan(-1)
    expect(amorce).toBeGreaterThan(migration)
  })

  it('il s’exécute AVANT les tests — sinon il ne sert à rien', () => {
    const amorce = ligneDuRun(/seed\/reference/)
    const tests = ligneDuRun(/npm run test/)
    expect(tests).toBeGreaterThan(-1)
    // `amorce` vaut -1 quand l'étape est absente : sans ce garde-fou,
    // l'assertion d'ordre passerait à vide et ne prouverait rien.
    expect(amorce).toBeGreaterThan(-1)
    expect(amorce).toBeLessThan(tests)
  })

  it('il reçoit DATABASE_URL — sans quoi il échoue au démarrage', () => {
    const bloc = CI.slice(CI.indexOf('seed/reference'))
    expect(bloc.slice(0, 400)).toMatch(/DATABASE_URL/)
  })
})

describe('GUIC-674 — le seed couvre ce que les tests exigent', () => {
  /**
   * Si un test d'intégration se met à demander un programme absent du seed, la
   * CI doit le dire ICI — pas trente échecs plus loin, dans une trace Prisma.
   */
  it('tout slug de programme utilisé en intégration existe dans le seed', () => {
    // Récursion manuelle : `fs.globSync` n'existe qu'à partir de Node 22 et la
    // CI tourne sur Node 20 — le test passerait ici et casserait là-bas.
    const fichiers = fichiersTests(resolve(RACINE, 'tests/integration'))

    const connus = new Set(PROGRAMMES_SEED.map((p) => p.slug))
    const manquants = new Map<string, string>()

    for (const fichier of fichiers) {
      const src = readFileSync(fichier, 'utf-8')
      for (const bloc of src.matchAll(/programmeSlugs:\s*\[([^\]]*)\]/g)) {
        for (const litteral of bloc[1].matchAll(/['"]([a-z0-9-]+)['"]/g)) {
          if (!connus.has(litteral[1])) manquants.set(litteral[1], fichier)
        }
      }
    }

    expect(Object.fromEntries(manquants)).toEqual({})
  })

  it('les quatre programmes CJS sont dans le seed', () => {
    expect(PROGRAMMES_SEED.map((p) => p.slug).sort()).toEqual(
      ['edupop', 'yaakaar', 'yeah', 'yjc'],
    )
  })
})
