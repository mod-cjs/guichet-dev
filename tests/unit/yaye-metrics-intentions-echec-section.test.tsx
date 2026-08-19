/**
 * @jest-environment jsdom
 *
 * Section « Intentions en échec » sur l'écran Analytics Yaye (GUIC-435).
 * Le backend (`computeIntentionsEnEchec`) est déjà fait/testé ; on ne teste ici que
 * l'affichage : ordre (pire d'abord — déjà garanti par le backend, on vérifie juste le
 * rendu fidèle), honnêteté du YQS null (jamais 0 fabriqué), et l'état vide.
 */
import { render, screen } from '@testing-library/react'
import type { IntentionSante } from '@/lib/ia/metrics/intentions-echec'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

import { YayeMetricsClient } from '@/app/admin/analytics/yaye/yaye-metrics-client'

const baseProps = {
  rollups: {
    sessions: 0,
    latenceTourMs: { p50: 0, p95: 0 },
    tauxSuccesOutil: 0,
    tauxErreurMoteur: 0,
    tauxRequeteSeche: 0,
    toursParSession: { p50: 0, moyenne: 0 },
    tauxConfinement: 0,
    tauxEscalade: 0,
    tauxAbandon: 0,
    profondeurBoucle: { moyenne: 0, distribution: {} },
    parCanal: {},
  },
  feedback: { csat: null, total: 0, positifs: 0, negatifs: 0 },
  outcomes: {
    tauxConversionReco: null,
    recosConverties: 0,
    recosVues: 0,
    candidaturesViaYaye: 0,
    reservationsViaYaye: 0,
  },
  yqs: {
    yqs: null,
    drapeauRouge: false,
    plafonne: false,
    qualite: {
      fidelite: null,
      pertinence: null,
      utilite: null,
      persona: null,
      conformiteCdp: null,
      langue: null,
      count: 0,
      drapeauxRouges: 0,
    },
    couches: { operationnel: null, efficacite: null, qualite: null, resultat: null, satisfaction: null },
  },
  regression: { baseline: null, current: { yqs: null, fidelite: null, conformiteCdp: null, intentPrecision: null }, result: null },
  calibration: null,
  topIntentions: [],
  evalCoverage: { total: 100, evaluees: 20, pct: 20 },
  filtres: { from: '2026-07-01', to: '2026-07-31', canal: 'tous' as const },
}

// Props des KPI amont hors périmètre (déjà couvertes ailleurs) — cast global volontaire.
function renderClient(intentionsEnEchec: IntentionSante[]) {
  const props = { ...baseProps, intentionsEnEchec } as unknown as Parameters<typeof YayeMetricsClient>[0]
  render(<YayeMetricsClient {...props} />)
}

describe('YayeMetricsClient — section Intentions en échec (GUIC-435)', () => {
  it('affiche une intention en échec avec ses taux, pire en premier', () => {
    const data: IntentionSante[] = [
      {
        intention: 'query_knowledge_graph',
        total: 12,
        tauxResolu: 20,
        tauxEscalade: 60,
        tauxDrapeauRouge: 10,
        yqsMoyen: 42,
        risque: 150,
      },
      {
        intention: 'search_opportunities',
        total: 30,
        tauxResolu: 90,
        tauxEscalade: 5,
        tauxDrapeauRouge: 0,
        yqsMoyen: 88,
        risque: 15,
      },
    ]
    renderClient(data)

    const rows = screen.getAllByTestId('intention-echec-row')
    expect(rows).toHaveLength(2)
    // Pire (query_knowledge_graph) en premier — ordre fourni par le backend, préservé au rendu.
    expect(rows[0]).toHaveTextContent('12')
    expect(rows[0]).toHaveTextContent('20')
    expect(rows[0]).toHaveTextContent('60')
    expect(rows[0]).toHaveTextContent('10')
    expect(rows[0]).toHaveTextContent('42')
  })

  it('affiche « — » quand yqsMoyen est null (jamais 0 fabriqué)', () => {
    renderClient([
      {
        intention: 'get_realtime_data',
        total: 8,
        tauxResolu: 50,
        tauxEscalade: 25,
        tauxDrapeauRouge: 0,
        yqsMoyen: null,
        risque: 75,
      },
    ])
    const row = screen.getByTestId('intention-echec-row')
    expect(row).toHaveTextContent('—')
    expect(row).not.toHaveTextContent('0/100')
  })

  it("affiche un message d'état vide si aucune intention en échec", () => {
    renderClient([])
    expect(screen.getByText("Pas assez de données d'intention sur la période.")).toBeInTheDocument()
    expect(screen.queryByTestId('intention-echec-row')).not.toBeInTheDocument()
  })

  it('GUIC-435 — affiche la couverture d’éval (échantillon) pour que « — » ne se lise pas « mauvais »', () => {
    renderClient([])
    expect(screen.getByText(/Couverture d.éval/)).toBeInTheDocument()
    expect(screen.getByText(/sessions évaluées par le juge/)).toBeInTheDocument()
    expect(screen.getByText(/ne signifie pas .* mauvais/)).toBeInTheDocument()
  })
})
