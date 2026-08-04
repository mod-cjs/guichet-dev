/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Aside du profil : checklist de complétion (réf `profil-web.jsx`,
 * `CompletionChecklist` L.178-225).
 *
 * L'écran annonce aujourd'hui « Profil complété 0 % » sans dire quoi faire.
 * La v5 remplace ça par la liste des étapes, chacune avec son GAIN, la plus
 * rentable mise en avant.
 *
 * Règle R2 du standard qualité — ne jamais fabriquer une caution chiffrée :
 * les gains ne sont pas recopiés de la maquette (qui annonce « Ajouter ton CV
 * +18 % » alors que le CV ne compte pas dans notre score), ils sont DÉRIVÉS du
 * barème réel de `profil-score.ts`. Le score et la checklist partagent la même
 * source : ils ne peuvent pas diverger.
 */
import { render, screen, within } from '@testing-library/react'

import { CRITERES_SCORE, calculerScore, etatCompletion } from '@/lib/profil-score'
import { CompletionChecklist } from '@/components/profil/CompletionChecklist'

const VIDE = {
  identite: { region: null, commune: null, genre: null, dateNaissance: null },
  profil: {
    biographie: null,
    niveauEtude: null,
    situationEmploi: null,
    domainesInteret: null,
    competences: null,
  },
  expCount: 0,
  diplomeCount: 0,
}

const PLEIN = {
  identite: { region: 'Dakar', commune: 'Plateau', genre: 'F', dateNaissance: '2002-01-01' },
  profil: {
    biographie: 'Bonjour',
    niveauEtude: 'BAC',
    situationEmploi: 'recherche',
    domainesInteret: ['Agriculture'],
    competences: ['Excel'],
  },
  expCount: 1,
  diplomeCount: 1,
}

describe('GUIC-689 — barème partagé entre score et checklist', () => {
  it('les critères couvrent exactement 100 points', () => {
    const total = CRITERES_SCORE.reduce((s, c) => s + c.poids, 0)
    expect(total).toBe(100)
  })

  it('le score reste celui calculé auparavant (aucune régression de barème)', () => {
    expect(calculerScore(PLEIN.identite, PLEIN.profil, PLEIN.expCount, PLEIN.diplomeCount)).toBe(100)
    expect(calculerScore(VIDE.identite, VIDE.profil, VIDE.expCount, VIDE.diplomeCount)).toBe(0)
  })

  it('l’état de complétion s’accorde avec le score, par construction', () => {
    const etat = etatCompletion(PLEIN.identite, PLEIN.profil, PLEIN.expCount, PLEIN.diplomeCount)
    const somme = etat.criteres.filter((c) => c.rempli).reduce((s, c) => s + c.poids, 0)
    expect(etat.score).toBe(somme)
    expect(etat.score).toBe(calculerScore(PLEIN.identite, PLEIN.profil, PLEIN.expCount, PLEIN.diplomeCount))
  })

  it('chaque critère porte un libellé lisible, jamais une clé technique', () => {
    for (const c of CRITERES_SCORE) {
      expect(c.label.length).toBeGreaterThan(3)
      expect(c.label).not.toMatch(/^[a-z]+([A-Z]|_)/)
    }
  })
})

describe('GUIC-689 — rendu de la checklist', () => {
  const etatVide = etatCompletion(VIDE.identite, VIDE.profil, VIDE.expCount, VIDE.diplomeCount)
  const etatPlein = etatCompletion(PLEIN.identite, PLEIN.profil, PLEIN.expCount, PLEIN.diplomeCount)

  it('affiche le score réel', () => {
    render(<CompletionChecklist etat={etatVide} />)
    expect(screen.getByTestId('completion-score')).toHaveTextContent('0')
  })

  it('affiche le gain réel de chaque étape restante — jamais un chiffre inventé', () => {
    render(<CompletionChecklist etat={etatVide} />)
    const liste = screen.getByTestId('completion-etapes')
    // La biographie pèse 20 dans `profil-score.ts` : c'est ce qui doit s'afficher.
    expect(liste.textContent).toMatch(/\+\s*20\s*%/)
    // Aucun gain affiché ne doit être absent du barème.
    const gains = [...liste.textContent!.matchAll(/\+\s*(\d+)\s*%/g)].map((m) => Number(m[1]))
    const poidsConnus = new Set(CRITERES_SCORE.map((c) => c.poids))
    for (const g of gains) expect(poidsConnus.has(g)).toBe(true)
  })

  it('met en avant l’étape la plus rentable', () => {
    render(<CompletionChecklist etat={etatVide} />)
    const misEnAvant = screen.getByTestId('completion-etape-forte')
    // Biographie = 20 points, le plus gros gain disponible.
    expect(misEnAvant.textContent).toMatch(/\+\s*20\s*%/)
  })

  it('n’affiche aucune étape restante quand le profil est complet', () => {
    render(<CompletionChecklist etat={etatPlein} />)
    expect(screen.getByTestId('completion-score')).toHaveTextContent('100')
    expect(screen.queryByTestId('completion-etape-forte')).not.toBeInTheDocument()
    const liste = screen.getByTestId('completion-etapes')
    expect(liste.textContent).not.toMatch(/\+\s*\d+\s*%/)
  })

  it('les étapes faites restent visibles, marquées comme acquises', () => {
    render(<CompletionChecklist etat={etatPlein} />)
    const liste = screen.getByTestId('completion-etapes')
    expect(within(liste).getAllByRole('listitem').length).toBe(CRITERES_SCORE.length)
  })

  it('aucun texte sous le plancher de 11 px, aucun hex en dur', () => {
    const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
    const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
    const src = readFileSync(
      resolve(__dirname, '../../src/components/profil/CompletionChecklist.tsx'),
      'utf-8',
    )
    const tailles = [...src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => parseFloat(m[1]))
    expect(tailles.filter((t) => t < 11)).toEqual([])
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
