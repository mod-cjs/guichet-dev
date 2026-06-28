/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — durcissement CDP (GUIC-259) : le verbatim contenant des PII
 * est masqué par défaut (pseudonymisé) et révélé seulement sur action explicite.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { SessionDetailClient } from '@/app/admin/yaye/sessions/[sessionId]/SessionDetailClient'
import type { ReconstructedTranscript } from '@/lib/ia/metrics/transcript'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

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

it('masque les PII du verbatim par défaut', () => {
  render(<SessionDetailClient transcript={transcript} refs={[]} />)
  expect(screen.getByText(/mon mail est \[email\]/)).toBeInTheDocument()
  expect(screen.queryByText(/awa@example\.com/)).not.toBeInTheDocument()
})

it('révèle les données brutes après clic sur le bouton', () => {
  render(<SessionDetailClient transcript={transcript} refs={[]} />)
  fireEvent.click(screen.getByRole('button', { name: /Révéler les données personnelles/i }))
  expect(screen.getByText(/awa@example\.com/)).toBeInTheDocument()
})
