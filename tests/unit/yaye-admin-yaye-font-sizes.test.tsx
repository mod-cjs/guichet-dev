/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — tailles de texte (GUIC-259, R-5). Aucun texte < 11px
 * (badges / micro-labels lisibles), hiérarchie conservée.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionsClient, type SessionsClientProps } from '@/app/admin/yaye/sessions/SessionsClient'
import { EscaladesClient, type EscaladesClientProps } from '@/app/admin/yaye/escalades/EscaladesClient'
import { SessionDetailClient, type SessionDetailClientProps } from '@/app/admin/yaye/sessions/[sessionId]/SessionDetailClient'
import type { ReconstructedTranscript } from '@/lib/ia/metrics/transcript'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/admin/yaye/sessions',
}))

function allFontSizes(container: HTMLElement): number[] {
  const out: number[] = []
  container.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const fs = el.style.fontSize
    if (fs && fs.endsWith('px')) out.push(parseFloat(fs))
  })
  return out
}

describe('SessionsClient — aucun texte < 11px', () => {
  it('toutes les tailles de police inline sont ≥ 11px', () => {
    const props: SessionsClientProps = {
      rows: [
        {
          sessionId: 's1', canal: 'web', cjsUid: 'u1', role: 'beneficiaire', centreId: 'c1', centreNom: 'CJS Dakar',
          debut: new Date().toISOString(), dureeMs: 5000, nbTours: 3, nbEvents: 9, outilPrincipal: 'search_opportunities',
          hasErreur: true, hasEscalade: true, user: { prenom: 'Awa', nom: 'Diop' }, yqs: 80, drapeauRouge: true,
          resolu: true, converti: true, feedback: 1,
        },
      ],
      summary: { sessions: 1, escalades: 1, erreurs: 1 },
      total: 1,
      currentPage: 1,
      totalPages: 1,
      centres: [{ id: 'c1', nom: 'CJS Dakar' }],
      roles: ['beneficiaire'],
      filtres: { from: '2026-06-01', to: '2026-06-30', canal: 'tous', q: '', filtre: '', role: '', centre: '' },
    }
    const { container } = render(<SessionsClient {...props} />)
    const tooSmall = allFontSizes(container).filter((n) => n < 11)
    expect(tooSmall).toEqual([])
  })
})

describe('EscaladesClient — aucun texte < 11px', () => {
  it('toutes les tailles de police inline sont ≥ 11px', () => {
    const props: EscaladesClientProps = {
      rows: [
        {
          id: 'e1', sessionId: 's1', cjsUid: 'u1', role: 'beneficiaire', centreId: 'c1', centreNom: 'CJS Dakar',
          canal: 'whatsapp', raison: 'sujet_sensible', stade: 'accueil', signalDanger: 'violence', priorite: 1, statut: 'prise_en_charge',
          traitePar: 'conseiller-1', traiteA: new Date().toISOString(), createdAt: new Date().toISOString(),
          user: { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' },
        },
      ],
      counts: { en_attente: 1, prise_en_charge: 1, resolue: 0 },
      total: 1,
      currentPage: 1,
      totalPages: 1,
      centres: [{ id: 'c1', nom: 'CJS Dakar' }],
      filtres: { statut: '', canal: 'tous', centre: '', danger: false },
    }
    const { container } = render(<EscaladesClient {...props} />)
    const tooSmall = allFontSizes(container).filter((n) => n < 11)
    expect(tooSmall).toEqual([])
  })
})

describe('SessionDetailClient — aucun texte < 11px', () => {
  const transcript = {
    sessionId: 'sess-1',
    canal: 'whatsapp',
    cjsUid: 'u-1',
    centreId: null,
    hasVerbatimText: false,
    events: [
      { type: 'graph_interroge', statut: 'succes', toolCalled: 'query_knowledge_graph', payload: { a: 1 }, tsMs: 1000, dureeMs: 20 },
    ],
    nbTours: 1,
    dureeMs: 1000,
    escalade: false,
    turns: [
      {
        index: 0, userLength: 10, toolsUsed: ['query_knowledge_graph'], toolResults: ['résultat'],
        intentions: ['recherche'], blocs: ['text'], rounds: 1, dureeMs: 1000, escalade: true, erreur: false,
      },
    ],
  } as unknown as ReconstructedTranscript

  const props: SessionDetailClientProps = {
    transcript,
    refs: [{ kind: 'beneficiaire', href: '/admin/utilisateurs/u-1', label: 'Awa Diop' }],
    user: { prenom: 'Awa', nom: 'Diop', telephone: null },
    centreNom: '—',
    quality: {
      eval: { juge: 'groq', fidelite: 0.9, pertinence: 0.9, utilite: 0.9, persona: 0.9, conformiteCdp: 0.9, langue: 0.9, drapeauRouge: false, commentaire: null },
      yqs: 80,
      resolu: true,
      converti: true,
    },
    feedback: [],
    escalade: null,
  }

  it('toutes les tailles de police inline sont ≥ 11px (onglet conversation)', () => {
    const { container } = render(<SessionDetailClient {...props} />)
    const tooSmall = allFontSizes(container).filter((n) => n < 11)
    expect(tooSmall).toEqual([])
  })

  it('toutes les tailles de police inline sont ≥ 11px (onglet technique)', () => {
    render(<SessionDetailClient {...props} />)
    fireEvent.click(screen.getByRole('tab', { name: /Technique/i }))
    const tooSmall = allFontSizes(document.body).filter((n) => n < 11)
    expect(tooSmall).toEqual([])
  })
})
