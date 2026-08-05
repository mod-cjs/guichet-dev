/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Timeline unifiée du parcours (réf `profil-web.jsx`,
 * `TimelineCard` L.567-616).
 *
 * La v5 fusionne en UN seul flux chronologique ce que l'application présentait
 * en trois listes séparées : formations, expériences professionnelles et
 * engagements. C'est le bon modèle — un parcours se lit dans le temps, pas par
 * catégorie administrative — mais il impose de normaliser trois sources aux
 * formes différentes :
 *
 *   - `Experience` porte `dateDebut` / `dateFin` (donc un « en cours » possible)
 *   - `Diplome`    ne porte qu'une `anneeObtention` : pas de début, pas d'« en cours »
 *   - `Engagement` porte `dateDebut` / `dateFin` (modèle créé pour l'occasion)
 *
 * Le tri doit rester correct malgré ces formes hétérogènes, et un élément en
 * cours doit passer devant un élément achevé la même année — sinon la lecture
 * du parcours est fausse au premier coup d'œil.
 */
import { render, screen, within } from '@testing-library/react'

import { construireParcours } from '@/lib/profil-parcours'
import { TimelineCard } from '@/components/profil/TimelineCard'

const EXPERIENCES = [
  { id: 'e1', poste: 'Stagiaire vente', organisation: 'Coopérative', dateDebut: '2023-06-01', dateFin: '2023-08-31', description: null },
  { id: 'e2', poste: 'Vendeuse', organisation: 'Marché central', dateDebut: '2025-01-10', dateFin: null, description: null },
]
const DIPLOMES = [
  { id: 'd1', intitule: 'Baccalauréat série G', etablissement: 'Lycée de Tambacounda', anneeObtention: 2022, niveau: 'BAC', mention: 'Bien', fichierUrl: null },
]
const ENGAGEMENTS = [
  { id: 'g1', role: 'Bénévole sensibilisation', organisation: 'Jeunesse & Environnement', dateDebut: '2022-03-01', dateFin: '2023-12-31', description: null },
]

describe('GUIC-689 — normalisation des trois sources', () => {
  const parcours = construireParcours(EXPERIENCES, DIPLOMES, ENGAGEMENTS)

  it('rassemble tout le parcours en un seul flux', () => {
    expect(parcours).toHaveLength(4)
    expect(new Set(parcours.map((p) => p.type))).toEqual(
      new Set(['experience', 'formation', 'engagement']),
    )
  })

  it('trie du plus récent au plus ancien', () => {
    const debuts = parcours.map((p) => p.debut)
    expect([...debuts].sort().reverse()).toEqual(debuts)
  })

  it('place l’élément en cours en tête', () => {
    expect(parcours[0].id).toBe('e2')
    expect(parcours[0].enCours).toBe(true)
  })

  it('un diplôme n’a qu’une année — il n’est jamais « en cours »', () => {
    const diplome = parcours.find((p) => p.type === 'formation')!
    expect(diplome.enCours).toBe(false)
    expect(diplome.periode).toBe('2022')
  })

  it('affiche une période lisible pour chaque forme', () => {
    const fini = parcours.find((p) => p.id === 'e1')!
    const enCours = parcours.find((p) => p.id === 'e2')!
    expect(fini.periode).toMatch(/2023/)
    expect(enCours.periode).toMatch(/en cours/i)
  })

  it('un parcours vide reste un parcours vide — rien n’est inventé', () => {
    expect(construireParcours([], [], [])).toEqual([])
  })
})

describe('GUIC-689 — rendu de la timeline', () => {
  it('rend un élément par entrée du parcours', () => {
    render(<TimelineCard parcours={construireParcours(EXPERIENCES, DIPLOMES, ENGAGEMENTS)} />)
    const liste = screen.getByTestId('parcours-liste')
    expect(within(liste).getAllByRole('listitem')).toHaveLength(4)
  })

  it('nomme la nature de chaque élément', () => {
    render(<TimelineCard parcours={construireParcours(EXPERIENCES, DIPLOMES, ENGAGEMENTS)} />)
    const liste = screen.getByTestId('parcours-liste')
    expect(liste.textContent).toMatch(/Formation/)
    expect(liste.textContent).toMatch(/Expérience/)
    expect(liste.textContent).toMatch(/Engagement/)
  })

  it('sans parcours, invite à en ajouter plutôt que d’afficher une carte vide', () => {
    render(<TimelineCard parcours={[]} />)
    expect(screen.queryByTestId('parcours-liste')).not.toBeInTheDocument()
    expect(screen.getByTestId('parcours-vide')).toBeInTheDocument()
  })

  it('aucun texte sous le plancher de 11 px, aucun hex en dur', () => {
    const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
    const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
    const src = readFileSync(resolve(__dirname, '../../src/components/profil/TimelineCard.tsx'), 'utf-8')
    const tailles = [...src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => parseFloat(m[1]))
    expect(tailles.filter((t) => t < 11)).toEqual([])
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
