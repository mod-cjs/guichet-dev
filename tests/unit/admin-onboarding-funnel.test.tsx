/**
 * GUIC-466 (F4) — AdminOnboardingFunnel : funnel d'onboarding admin (SUPERVISION).
 * Taux de complétion, jeunes en cours / à relancer, complétude moyenne, par région,
 * nouvelles inscriptions. Lecture seule (aucune action).
 */
import { render, screen } from '@testing-library/react'

import { AdminOnboardingFunnel, type FunnelData } from '@/app/admin/onboarding/AdminOnboardingFunnel'

const DATA: FunnelData = {
  total: 1000,
  onboardes: 600,
  tauxComplete: 60,
  enCours: 250,
  aRelancer: 80,
  completudeMoyenne: 72,
  parRegion: [
    { region: 'Dakar', total: 400, onboardes: 280, taux: 70 },
    { region: 'Thiès', total: 200, onboardes: 100, taux: 50 },
    { region: 'Inconnue', total: 50, onboardes: 10, taux: 20 },
  ],
  inscriptionsParMois: [
    { mois: 'Jan', count: 100 },
    { mois: 'Fév', count: 150 },
    { mois: 'Mar', count: 200 },
  ],
}

describe('GUIC-466 — AdminOnboardingFunnel (supervision)', () => {
  it('affiche le titre Onboarding', () => {
    render(<AdminOnboardingFunnel data={DATA} />)
    expect(screen.getByRole('heading', { name: /onboarding/i })).toBeInTheDocument()
  })

  it('affiche le taux de complétion global', () => {
    render(<AdminOnboardingFunnel data={DATA} />)
    expect(screen.getByText(/taux de compl[ée]tion/i)).toBeInTheDocument()
    expect(screen.getAllByText(/60\s*%/).length).toBeGreaterThanOrEqual(1)
  })

  it('affiche onboardés, en cours et à relancer', () => {
    render(<AdminOnboardingFunnel data={DATA} />)
    expect(screen.getAllByText(/onboard[ée]s/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/en cours/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/à relancer/i)).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument() // aRelancer
  })

  it('affiche la complétude moyenne du profil', () => {
    render(<AdminOnboardingFunnel data={DATA} />)
    expect(screen.getByText(/compl[ée]tude moyenne/i)).toBeInTheDocument()
    expect(screen.getByText(/72\s*%/)).toBeInTheDocument()
  })

  it('liste la répartition par région avec leur taux', () => {
    render(<AdminOnboardingFunnel data={DATA} />)
    expect(screen.getByText('Dakar')).toBeInTheDocument()
    expect(screen.getByText('Thiès')).toBeInTheDocument()
    expect(screen.getByText(/70\s*%/)).toBeInTheDocument()
  })

  it('affiche les nouvelles inscriptions par mois', () => {
    render(<AdminOnboardingFunnel data={DATA} />)
    expect(screen.getByText(/nouvelles inscriptions/i)).toBeInTheDocument()
    expect(screen.getByText('Mar')).toBeInTheDocument()
  })

  it('NE propose AUCUne action d\'écriture (supervision)', () => {
    render(<AdminOnboardingFunnel data={DATA} />)
    expect(screen.queryByRole('button', { name: /relancer|envoyer|notifier|supprimer/i })).toBeNull()
  })

  it('gère 0 jeune sans planter (pas de division par zéro)', () => {
    render(<AdminOnboardingFunnel data={{ ...DATA, total: 0, onboardes: 0, tauxComplete: 0, enCours: 0, aRelancer: 0, parRegion: [] }} />)
    expect(screen.getByRole('heading', { name: /onboarding/i })).toBeInTheDocument()
  })
})
