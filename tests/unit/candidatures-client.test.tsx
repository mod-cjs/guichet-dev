import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  CandidaturesClient,
  CANDIDATURES_MOCK,
  type CandidatureMock,
} from '@/components/candidatures'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('<CandidaturesClient />', () => {
  it('rend le compteur de dossiers et la liste complète par défaut', () => {
    render(<CandidaturesClient items={CANDIDATURES_MOCK} />)
    expect(screen.getByTestId('candidatures-counter')).toHaveTextContent(
      `${CANDIDATURES_MOCK.length} dossiers`,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(CANDIDATURES_MOCK.length)
  })

  // GUIC-689 (É-14) — le filtre porte désormais sur le GROUPE, pas sur l'étape :
  // « En cours » réunit Envoyée et En revue. L'intention du test — un filtre
  // restreint bien la liste — est inchangée.
  it('filtre « En cours » ne montre que les candidatures envoyées ou en revue', () => {
    render(<CandidaturesClient items={CANDIDATURES_MOCK} />)
    fireEvent.click(screen.getByRole('button', { name: /En cours/i }))
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(
      CANDIDATURES_MOCK.filter((c) => c.currentStep === 'Envoyee' || c.currentStep === 'EnRevue').length,
    )
  })

  it('empty state si liste vide globale', () => {
    render(<CandidaturesClient items={[]} />)
    expect(screen.getByText(/Pas encore de candidature/i)).toBeInTheDocument()
  })

  it('empty state filtre — message dédié + bouton "Voir toutes"', () => {
    const items: CandidatureMock[] = [
      {
        id: 'a',
        opportuniteSlug: 'a',
        opportuniteTitre: 'A',
        organisation: 'X',
        type: 'Stage',
        currentStep: 'Envoyee',
        decision: null,
        envoyeeA: '2026-05-30T00:00:00.000Z',
      },
    ]
    render(<CandidaturesClient items={items} />)
    fireEvent.click(screen.getByRole('button', { name: /Entretien/i }))
    expect(screen.getByTestId('candidatures-empty-filter')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Voir toutes/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('affiche "1 dossier" (singulier) quand items.length === 1', () => {
    const items: CandidatureMock[] = [CANDIDATURES_MOCK[0]]
    render(<CandidaturesClient items={items} />)
    expect(screen.getByTestId('candidatures-counter')).toHaveTextContent('1 dossier')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GUIC-689 — bandeau de 4 tuiles statistiques dérivées (finding F)
// ─────────────────────────────────────────────────────────────────────────────

describe('<CandidaturesClient /> — bandeau statistiques (GUIC-689, finding F)', () => {
  it('dérive les 4 tuiles des candidatures déjà chargées (CANDIDATURES_MOCK)', () => {
    render(<CandidaturesClient items={CANDIDATURES_MOCK} />)
    const stats = screen.getByTestId('candidatures-stats')
    // 6 candidatures : 4 hors décision (Brouillon/Envoyee/EnRevue/Entretien),
    // 1 en Entretien, 4/5 envoyées ont eu une réponse (Envoyee exclu) → 80%.
    expect(within(stats).getByTestId('candidatures-stat-total')).toHaveTextContent('6')
    expect(within(stats).getByTestId('candidatures-stat-en-cours')).toHaveTextContent('4')
    expect(within(stats).getByTestId('candidatures-stat-entretiens')).toHaveTextContent('1')
    expect(within(stats).getByTestId('candidatures-stat-taux-reponse')).toHaveTextContent('80%')
  })

  it('affiche "—" pour le taux de réponse quand aucune candidature n\'a été envoyée (que des brouillons)', () => {
    const items: CandidatureMock[] = [
      {
        id: 'a',
        opportuniteSlug: 'a',
        opportuniteTitre: 'A',
        organisation: 'X',
        type: 'Stage',
        currentStep: 'Brouillon',
        decision: null,
        envoyeeA: '2026-05-30T00:00:00.000Z',
      },
    ]
    render(<CandidaturesClient items={items} />)
    expect(screen.getByTestId('candidatures-stat-taux-reponse')).toHaveTextContent('—')
  })

  it('affiche le bandeau statistiques même liste vide (0 partout, pas de crash)', () => {
    render(<CandidaturesClient items={[]} />)
    expect(screen.getByTestId('candidatures-stat-total')).toHaveTextContent('0')
  })
})
