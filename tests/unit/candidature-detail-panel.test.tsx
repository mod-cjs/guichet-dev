/**
 * GUIC-692 (PR-B) — CandidatureDetailPanel : fiche candidature en SLIDE-OVER (lecture seule).
 * Stepper pipeline, score IA + raison (« en cours » si null), documents CV+lettre,
 * snapshot figé (6 clés formulaireData), entretiens, consentement CGU/IP, conversation
 * lecture seule, footer (Voir la conversation · Relancer · Exporter). Supervision. TDD — RED.
 */
import { render, screen, within } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, refresh: jest.fn() }) }))

import { CandidatureDetailPanel, type CandidatureDetail } from '@/app/admin/candidatures/CandidatureDetailPanel'

const DETAIL: CandidatureDetail = {
  id: 'c1',
  candidatPrenom: 'Awa', candidatNom: 'Ndiaye', candidatCjsUid: 'usr_8f2a',
  opportuniteId: 'o1', opportuniteTitre: 'Développeur backend', recruteur: 'Senstartup',
  statut: 'Vue', etape: 'Preselection', score: 88, scoreRaison: 'Bonne correspondance compétences.',
  soumiseLe: '30 juil. 2026',
  cvUrl: 'https://cdn/cv.pdf', lettreMotivation: 'Madame, Monsieur, …',
  snapshot: { email: 'awa@exemple.sn', telephone: '+221770000010', niveauEtude: 'Licence', situationEmploi: 'En recherche', competences: ['React', 'Node.js'], domainesInteret: ['Numérique'] },
  consent: { version: 'v2.1', consentiLe: '30 juil. 2026', ip: '41.82.140.10', notifications: true },
  entretiens: [{ id: 'e1', dateLabel: '12 août · 15:00', mode: 'Visio', statut: 'Planifie', lieu: 'https://meet.guichet.sn/e1' }],
  conversation: { messages: [
    { id: 'm1', auteur: 'recruteur', corps: 'Bonjour, disponible cette semaine ?', dateLabel: 'il y a 4 j' },
    { id: 'm2', auteur: 'candidat', corps: 'Oui, jeudi après-midi.', dateLabel: 'il y a 3 j' },
  ] },
}

describe('GUIC-692 — CandidatureDetailPanel', () => {
  it('en-tête : candidat → offre, cjs_uid, statut, score', () => {
    render(<CandidatureDetailPanel detail={DETAIL} onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: /Awa Ndiaye.*Développeur backend/i })).toBeInTheDocument()
    expect(screen.getByText(/usr_8f2a/)).toBeInTheDocument()
    expect(screen.getByText(/Score 88/)).toBeInTheDocument()
  })

  it('stepper pipeline avec l’étape courante', () => {
    render(<CandidatureDetailPanel detail={DETAIL} onClose={() => {}} />)
    expect(screen.getByText(/Étape/i)).toBeInTheDocument()
    expect(screen.getByText('Présélection')).toBeInTheDocument()
    expect(screen.getByText('Entretien')).toBeInTheDocument()
  })

  it('score IA + raison réelle', () => {
    render(<CandidatureDetailPanel detail={DETAIL} onClose={() => {}} />)
    expect(screen.getByText(/Bonne correspondance compétences/i)).toBeInTheDocument()
  })

  it('score null → « en cours de calcul »', () => {
    render(<CandidatureDetailPanel detail={{ ...DETAIL, score: null, scoreRaison: null }} onClose={() => {}} />)
    expect(screen.getByText(/en cours de calcul/i)).toBeInTheDocument()
  })

  it('documents CV + lettre', () => {
    render(<CandidatureDetailPanel detail={DETAIL} onClose={() => {}} />)
    expect(screen.getByRole('link', { name: /CV/i })).toHaveAttribute('href', 'https://cdn/cv.pdf')
    expect(screen.getByRole('button', { name: /Lettre de motivation/i })).toBeInTheDocument()
  })

  it('snapshot figé : les 6 clés de formulaireData', () => {
    render(<CandidatureDetailPanel detail={DETAIL} onClose={() => {}} />)
    expect(screen.getByText('Licence')).toBeInTheDocument()
    expect(screen.getByText('En recherche')).toBeInTheDocument()
    expect(screen.getByText(/awa@exemple\.sn/)).toBeInTheDocument()
    expect(screen.getByText(/\+221770000010/)).toBeInTheDocument()
    expect(screen.getByText(/React/)).toBeInTheDocument()
    expect(screen.getByText(/Numérique/)).toBeInTheDocument()
  })

  it('entretiens (mode/date/statut)', () => {
    render(<CandidatureDetailPanel detail={DETAIL} onClose={() => {}} />)
    expect(screen.getByText(/12 août · 15:00/)).toBeInTheDocument()
    expect(screen.getByText(/Visio/)).toBeInTheDocument()
  })

  it('entretiens : état vide', () => {
    render(<CandidatureDetailPanel detail={{ ...DETAIL, entretiens: [] }} onClose={() => {}} />)
    expect(screen.getByText(/Aucun entretien/i)).toBeInTheDocument()
  })

  it('consentement CGU + IP + version', () => {
    render(<CandidatureDetailPanel detail={DETAIL} onClose={() => {}} />)
    expect(screen.getByText('v2.1')).toBeInTheDocument()
    expect(screen.getByText(/41\.82\.140\.10/)).toBeInTheDocument()
  })

  it('conversation lecture seule : messages candidat ↔ recruteur', () => {
    render(<CandidatureDetailPanel detail={DETAIL} onClose={() => {}} />)
    expect(screen.getByText(/disponible cette semaine/i)).toBeInTheDocument()
    expect(screen.getByText(/jeudi après-midi/i)).toBeInTheDocument()
  })

  it('footer : Voir la conversation · Relancer · Exporter — AUCUN Retenir/Refuser', () => {
    render(<CandidatureDetailPanel detail={DETAIL} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /Voir la conversation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Relancer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exporter/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Retenir/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Refuser/i })).toBeNull()
  })
})
