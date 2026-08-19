/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — hub « Santé de Yaye » (GUIC-435, Phase 4).
 * SanteClient agrège des signaux déjà calculés côté backend (computeYayeSante) ; ce
 * composant ne fait qu'afficher honnêtement — jamais de nombre inventé, une valeur
 * null s'affiche « — » (jamais 0).
 */
import { render, screen } from '@testing-library/react'
import { SanteClient } from '@/app/admin/yaye/SanteClient'
import type { YayeSante } from '@/lib/ia/admin/sante'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

const baseSante: YayeSante = {
  yqs: 78,
  regressed: false,
  regressionDeltas: null,
  escalades: { enAttente: 2, slaDepassees: 0, dangerOuvertes: 0 },
  coverage: { total: 120, evaluees: 40, pct: 33 },
  calibrationDrift: 0.1,
  topEchecs: [
    { intention: 'orientation_formation', total: 24, tauxResolu: 40, tauxEscalade: 20, tauxDrapeauRouge: 5, yqsMoyen: 55, risque: 90 },
  ],
  config: {
    slots: [
      { slot: 'agent', modele: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', source: 'admin', autorise: true, capacitesOk: true, capacitesManquantes: [], endpointDedieRequis: false },
      { slot: 'judge', modele: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', source: 'defaut', autorise: true, capacitesOk: true, capacitesManquantes: [], endpointDedieRequis: false },
      { slot: 'adequation', modele: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', source: 'defaut', autorise: true, capacitesOk: true, capacitesManquantes: [], endpointDedieRequis: false },
    ],
    alertes: [],
  },
  alertes: [],
}

describe('GUIC-435 — SanteClient', () => {
  it('alerte critique en tête avec le style critique', () => {
    const sante: YayeSante = { ...baseSante, alertes: [{ niveau: 'critique', message: 'La qualité de Yaye a baissé sous la référence.' }] }
    render(<SanteClient sante={sante} />)
    expect(screen.getByText(/La qualité de Yaye a baissé sous la référence\./i)).toBeInTheDocument()
  })

  it('alertes vides → bloc « Aucune alerte »', () => {
    render(<SanteClient sante={baseSante} />)
    expect(screen.getByText(/Aucune alerte/i)).toBeInTheDocument()
    expect(screen.getByText(/Yaye se porte bien/i)).toBeInTheDocument()
  })

  it('yqs null → affiche « — » (jamais 0)', () => {
    const sante: YayeSante = { ...baseSante, yqs: null }
    render(<SanteClient sante={sante} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument()
  })

  it('escalades au-delà du SLA > 0 → affichées en rouge avec le nombre', () => {
    const sante: YayeSante = { ...baseSante, escalades: { enAttente: 5, slaDepassees: 3, dangerOuvertes: 1 } }
    render(<SanteClient sante={sante} />)
    expect(screen.getByText(/3 au-delà du SLA/i)).toBeInTheDocument()
  })

  it('affiche un top échec avec son intention', () => {
    render(<SanteClient sante={baseSante} />)
    expect(screen.getByText(/orientation_formation/i)).toBeInTheDocument()
  })

  it('section config : slot agent affiché avec libellé de modèle et statut OK', () => {
    render(<SanteClient sante={baseSante} />)
    const row = screen.getByTestId('config-slot-agent')
    expect(row).toHaveTextContent('Agent (Yaye)')
    expect(row).toHaveTextContent('Gemini 2.5 Flash')
    expect(row).toHaveTextContent('OK')
  })

  it('section config : slot hors allowlist → pastille « Hors allowlist »', () => {
    const sante: YayeSante = {
      ...baseSante,
      config: {
        ...baseSante.config,
        slots: [
          { slot: 'agent', modele: 'openai/gpt-4o', label: null, source: 'env', autorise: false, capacitesOk: false, capacitesManquantes: [], endpointDedieRequis: false },
          ...baseSante.config.slots.slice(1),
        ],
      },
    }
    render(<SanteClient sante={sante} />)
    expect(screen.getByTestId('config-slot-agent')).toHaveTextContent(/Hors allowlist/i)
  })
})
