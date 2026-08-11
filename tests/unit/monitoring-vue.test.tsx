/**
 * GUIC-704 · Lot 3 — refonte du Monitoring de veille (registre + santé + alertes actionnables).
 * Le loader (stats) est déjà testé côté intégration ; ici on verrouille le RENDU refondu.
 */
import { render, screen } from '@testing-library/react'
import { MonitoringVue, type LigneMonitoring } from '@/app/admin/curation/monitoring/MonitoringVue'
import type { ResumeCuration } from '@/lib/curation/monitoring/stats'

const RESUME: ResumeCuration = { nbSources: 3, nbEnAlerte: 1, parStatut: { a_valider: 12, approuvee: 40 } }

function ligne(over: Partial<LigneMonitoring> = {}): LigneMonitoring {
  return {
    sourceId: 's1', nom: 'ConcoursN', actif: true, nbRapportees: 20, tauxApprobation: 80,
    tauxRejet: 20, nbErreursRecentes: 0, derniereVerif: '10/08/2026', alerte: null, ...over,
  }
}

function renderVue(lignes: LigneMonitoring[], resume = RESUME) {
  return render(<MonitoringVue resume={resume} lignes={lignes} />)
}

describe('GUIC-704 — Monitoring (refonte registre)', () => {
  it('affiche la synthèse : nombre de sources et sources en alerte', () => {
    renderVue([ligne()])
    expect(screen.getByText(/3/).closest('*')).toBeInTheDocument()
    expect(screen.getByText(/Sources/i)).toBeInTheDocument()
    expect(screen.getByText(/En alerte/i)).toBeInTheDocument()
  })

  it('badge santé OK pour une source saine', () => {
    renderVue([ligne()])
    expect(screen.getByText('OK')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('badge « Instable » quand des erreurs récentes sans alerte', () => {
    renderVue([ligne({ nbErreursRecentes: 2, alerte: null })])
    expect(screen.getByText(/Instable/i)).toBeInTheDocument()
  })

  it('source en alerte chute_zero : libellé explicite + bandeau actionnable avec lien', () => {
    renderVue([ligne({ nom: 'LinkedIn Jobs', alerte: 'chute_zero' })])
    expect(screen.getByText(/Chute à zéro/i)).toBeInTheDocument()
    // Bandeau d'alerte : lien vers la gestion des sources pour agir.
    const lien = screen.getByRole('link', { name: /LinkedIn Jobs|Gérer|Voir la source/i })
    expect(lien).toHaveAttribute('href', expect.stringContaining('/admin/sources-veille'))
  })

  it('état vide quand aucune source', () => {
    renderVue([], { nbSources: 0, nbEnAlerte: 0, parStatut: {} })
    expect(screen.getByText(/Aucune source/i)).toBeInTheDocument()
  })
})
