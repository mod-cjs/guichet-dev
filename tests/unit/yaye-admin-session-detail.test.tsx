/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — détail de session (GUIC-259). Décision PO : pas d'anonymisation
 * du verbatim côté admin. On vérifie l'affichage brut + le panneau qualité (score juge).
 */

import { render, screen } from '@testing-library/react'
import { SessionDetailClient, type SessionDetailClientProps } from '@/app/admin/yaye/sessions/[sessionId]/SessionDetailClient'
import type { ReconstructedTranscript } from '@/lib/ia/metrics/transcript'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))

const transcript = {
  sessionId: 'sess-1',
  canal: 'whatsapp',
  cjsUid: 'u-1',
  centreId: null,
  hasVerbatimText: true,
  events: [],
  nbTours: 1,
  dureeMs: 1000,
  escalade: false,
  turns: [
    {
      index: 0,
      userText: 'mon mail est awa@example.com',
      userLength: 28,
      assistantText: 'Bien reçu.',
      toolsUsed: [],
      toolResults: [],
      intentions: [],
      blocs: ['text'],
      rounds: 1,
      dureeMs: 1000,
      escalade: false,
      erreur: false,
    },
  ],
} as unknown as ReconstructedTranscript

const baseProps: SessionDetailClientProps = {
  transcript,
  refs: [],
  user: { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' },
  centreNom: 'CJS Dakar',
  quality: { eval: null, yqs: null, resolu: false, converti: false },
  feedback: [],
  escalade: null,
}

it('affiche le verbatim en clair (plus d\'anonymisation admin)', () => {
  render(<SessionDetailClient {...baseProps} />)
  expect(screen.getByText(/mon mail est awa@example\.com/)).toBeInTheDocument()
})

it('affiche le nom du bénéficiaire et le score du juge quand présent', () => {
  render(
    <SessionDetailClient
      {...baseProps}
      quality={{
        eval: { juge: 'groq:llama@rubric-v4', fidelite: 0.9, pertinence: 0.8, utilite: 0.8, persona: 0.9, conformiteCdp: 0.95, langue: 0.9, drapeauRouge: false, commentaire: 'Réponse fidèle.' },
        yqs: 82,
        resolu: true,
        converti: false,
      }}
    />,
  )
  expect(screen.getByText('Awa Diop')).toBeInTheDocument()
  expect(screen.getByText(/YQS 82\/100/)).toBeInTheDocument()
  expect(screen.getByText(/Réponse fidèle\./)).toBeInTheDocument()
})

it('propose le formulaire de notation humaine (calibration)', () => {
  render(<SessionDetailClient {...baseProps} />)
  expect(screen.getByText(/Noter cette conversation/i)).toBeInTheDocument()
})

it('affiche le NOM du centre (jamais le cuid technique brut) — R-3', () => {
  render(<SessionDetailClient {...baseProps} />)
  expect(screen.getByText('CJS Dakar')).toBeInTheDocument()
})
