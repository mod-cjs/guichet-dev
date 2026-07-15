/**
 * @jest-environment node
 *
 * C-CD1 (GUIC-568) — Sentinelle : aucun workflow ne doit référencer une image GHCR avec un nom
 * NON normalisé en minuscules.
 *
 * `github.repository` vaut `adiop-consortiumjeunessesenegal-org-CJS/guichet` (CJS en MAJUSCULES).
 * GHCR exige des noms d'image en minuscules → `docker push ghcr.io/…-CJS/guichet` échoue
 * (« repository name must be lowercase ») et AUCUN déploiement ne part. Ce bug ne s'exécute que
 * sur les runners : aucun test unitaire de code ne pouvait l'attraper. On le fige donc en
 * sentinelle qui LIT les workflows — la découverte manuelle du challenge devient permanente.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const WORKFLOWS_DIR = join(process.cwd(), '.github', 'workflows')

/** Référence d'image GHCR bâtie directement sur `github.repository` (donc PAS en minuscules). */
const RE_RAW_REPO_IMAGE = /ghcr\.io\/\$\{\{\s*github\.repository\s*\}\}/

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f))
}

describe('C-CD1 — noms d’image GHCR en minuscules', () => {
  it('trouve bien des workflows', () => {
    expect(workflowFiles().length).toBeGreaterThan(0)
  })

  it('aucun workflow n’utilise ghcr.io/${{ github.repository }} sans normalisation minuscule', () => {
    const fautifs: string[] = []
    for (const f of workflowFiles()) {
      const contenu = readFileSync(join(WORKFLOWS_DIR, f), 'utf8')
      if (RE_RAW_REPO_IMAGE.test(contenu)) fautifs.push(f)
    }
    // Passer par une étape de normalisation (tr '[:upper:]' '[:lower:]') puis
    // référencer steps.<id>.outputs.base — jamais github.repository brut dans une image GHCR.
    expect(fautifs).toEqual([])
  })
})
