/**
 * @jest-environment jsdom
 *
 * GUIC-689 (É-14) — Les filtres de candidatures parlent au jeune, pas au code.
 *
 * L'écran exposait les six étapes techniques du pipeline : « Brouillon »,
 * « Envoyée », « En revue », « Entretien », « Décision ». C'est notre
 * vocabulaire interne. La v5 (`candidatures-web.jsx`) regroupe par INTENTION.
 *
 * Décision du lead (2026-08-11) : les quatre groupes v5, plus « Brouillons »
 * conservé à part. Un brouillon n'est pas une candidature en cours — c'est une
 * candidature que le jeune doit finir d'écrire, la seule catégorie où il a
 * quelque chose à faire. La noyer dans « En cours » la rendrait invisible.
 *
 * Conséquence directe du retrait de candidature : une candidature retirée
 * portait l'étape `Decision` et s'affichait donc sous « Décision » — alors
 * qu'aucune décision n'a été prise. Elle tombe désormais dans « Clôturées ».
 */
import { render, screen, fireEvent } from '@testing-library/react'

import { CandidaturesClient } from '@/components/candidatures/CandidaturesClient'
import { GROUPE_LABELS, groupeDeLEtape, type CandidatureMock } from '@/components/candidatures/types'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))

let n = 0
function item(currentStep: CandidatureMock['currentStep'], decision: CandidatureMock['decision'] = null): CandidatureMock {
  n += 1
  return {
    id: `c${n}`,
    opportuniteSlug: `offre-${n}`,
    opportuniteTitre: `Offre ${n}`,
    organisation: 'Org',
    type: 'Stage',
    currentStep,
    decision,
    envoyeeA: '2026-08-01T10:00:00.000Z',
  }
}

describe('GUIC-689 (É-14) — regroupement par intention', () => {
  it.each([
    ['Brouillon', 'Brouillons'],
    ['Envoyee', 'EnCours'],
    ['EnRevue', 'EnCours'],
    ['Entretien', 'Entretiens'],
    ['Decision', 'Cloturees'],
  ] as const)('étape %s → groupe %s', (etape, groupe) => {
    expect(groupeDeLEtape(etape)).toBe(groupe)
  })

  it('un brouillon n’est PAS « en cours » — c’est le seul endroit où le jeune doit agir', () => {
    expect(groupeDeLEtape('Brouillon')).not.toBe('EnCours')
  })

  it('les libellés sont ceux de la v5, pas le vocabulaire du pipeline', () => {
    expect(GROUPE_LABELS.all).toBe('Toutes')
    expect(GROUPE_LABELS.Brouillons).toBe('Brouillons')
    expect(GROUPE_LABELS.EnCours).toBe('En cours')
    expect(GROUPE_LABELS.Entretiens).toBe('Entretiens')
    expect(GROUPE_LABELS.Cloturees).toBe('Clôturées')
  })
})

describe('GUIC-689 (É-14) — à l’écran', () => {
  const jeu = [
    item('Brouillon'),
    item('Brouillon'),
    item('Envoyee'),
    item('EnRevue'),
    item('Entretien'),
    item('Decision', 'Acceptee'),
    item('Decision', 'Refusee'),
    item('Decision', null), // candidature RETIRÉE : aucune décision du recruteur
  ]

  it('cinq puces, et aucune ne porte le vocabulaire technique', () => {
    render(<CandidaturesClient items={jeu} />)
    for (const libelle of ['Toutes', 'Brouillons', 'En cours', 'Entretiens', 'Clôturées']) {
      expect(screen.getByRole('button', { name: new RegExp(libelle) })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /^En revue/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Décision/ })).toBeNull()
  })

  it('les compteurs répartissent chaque candidature une seule fois', () => {
    render(<CandidaturesClient items={jeu} />)
    const compteur = (libelle: string) =>
      Number(screen.getByRole('button', { name: new RegExp(libelle) }).textContent?.match(/\d+/)?.[0] ?? -1)

    expect(compteur('Brouillons')).toBe(2)
    expect(compteur('En cours')).toBe(2)   // Envoyee + EnRevue
    expect(compteur('Entretiens')).toBe(1)
    expect(compteur('Clôturées')).toBe(3)  // les trois Decision, retrait compris
    expect(compteur('Toutes')).toBe(jeu.length)
  })

  it('filtrer « Brouillons » ne montre que les brouillons', () => {
    render(<CandidaturesClient items={jeu} />)
    fireEvent.click(screen.getByRole('button', { name: /Brouillons/ }))
    expect(screen.getAllByRole('article').length).toBe(2)
  })

  it('une candidature RETIRÉE se range dans « Clôturées », plus sous « Décision »', () => {
    render(<CandidaturesClient items={[item('Decision', null)]} />)
    fireEvent.click(screen.getByRole('button', { name: /Clôturées/ }))
    expect(screen.getAllByRole('article').length).toBe(1)
  })
})
