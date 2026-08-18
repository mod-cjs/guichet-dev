/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — glyphes → Icon (GUIC-259, R-5). Jamais de caractère brut
 * (↗, →) utilisé comme icône : `<Icon>` uniquement.
 */
import { render, screen } from '@testing-library/react'
import { SessionsClient, type SessionsClientProps } from '@/app/admin/yaye/sessions/SessionsClient'
import { SessionDetailClient } from '@/app/admin/yaye/sessions/[sessionId]/SessionDetailClient'
import type { ReconstructedTranscript } from '@/lib/ia/metrics/transcript'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/admin/yaye/sessions',
}))

const sessionsProps: SessionsClientProps = {
  rows: [],
  summary: { sessions: 0, escalades: 0, erreurs: 0 },
  total: 0,
  currentPage: 1,
  totalPages: 1,
  centres: [{ id: 'c1', nom: 'CJS Dakar' }],
  roles: ['beneficiaire'],
  filtres: { from: '2026-06-01', to: '2026-06-30', canal: 'tous', q: '', filtre: '', role: '', centre: '' },
}

it('le séparateur entre les deux dates est un <Icon>, pas le glyphe « → »', () => {
  const { container } = render(<SessionsClient {...sessionsProps} />)
  expect(container.textContent).not.toContain('→')
  expect(container.querySelector('svg use[href="/icons.svg#i-arrow-right"]')).toBeInTheDocument()
})

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
      userText: 'bonjour',
      userLength: 7,
      assistantText: 'salut',
      toolsUsed: [],
      toolResults: [],
      intentions: [],
      blocs: ['text'],
      rounds: 1,
      dureeMs: 1000,
      escalade: true,
      erreur: false,
    },
  ],
} as unknown as ReconstructedTranscript

it("l'indicateur d'escalade (verbatim) utilise un <Icon>, pas le glyphe « ↗ »", () => {
  const { container } = render(
    <SessionDetailClient
      transcript={transcript}
      refs={[]}
      user={null}
      centreNom="—"
      quality={{ eval: null, yqs: null, resolu: false, converti: false }}
      feedback={[]}
      escalade={null}
    />,
  )
  expect(container.textContent).not.toContain('↗')
  expect(screen.getByText(/Escalade vers un conseiller/i)).toBeInTheDocument()
})

it("l'indicateur d'escalade (structure, canal web) utilise un <Icon>, pas le glyphe « ↗ »", () => {
  const webTranscript = {
    ...transcript,
    hasVerbatimText: false,
    turns: [{ ...transcript.turns[0], userText: undefined, assistantText: undefined }],
  } as unknown as ReconstructedTranscript
  const { container } = render(
    <SessionDetailClient
      transcript={webTranscript}
      refs={[]}
      user={null}
      centreNom="—"
      quality={{ eval: null, yqs: null, resolu: false, converti: false }}
      feedback={[]}
      escalade={null}
    />,
  )
  expect(container.textContent).not.toContain('↗')
  expect(screen.getByText(/Escalade conseiller/i)).toBeInTheDocument()
})
