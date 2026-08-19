/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — cibles tactiles (GUIC-259, R-5). Toutes les zones cliquables
 * doivent atteindre 44px (règle projet `--tap-min`).
 */
import { render, screen } from '@testing-library/react'
import { SessionsClient, type SessionsClientProps } from '@/app/admin/yaye/sessions/SessionsClient'
import { EscaladesClient, type EscaladesClientProps } from '@/app/admin/yaye/escalades/EscaladesClient'

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

const escaladesProps: EscaladesClientProps = {
  rows: [
    {
      id: 'e1', sessionId: 's1', cjsUid: 'u1', role: 'beneficiaire', centreId: 'c1', centreNom: 'CJS Dakar',
      canal: 'whatsapp', raison: 'sujet_sensible', stade: null, signalDanger: null, priorite: 0, statut: 'en_attente',
      traitePar: null, traiteA: null, createdAt: new Date().toISOString(), echeanceSla: new Date(Date.now()+20*60000).toISOString(), enRetardSla: false,
      user: { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' },
    },
  ],
  counts: { en_attente: 1, prise_en_charge: 0, resolue: 0 },
  total: 1,
  currentPage: 1,
  totalPages: 1,
  centres: [{ id: 'c1', nom: 'CJS Dakar' }],
  filtres: { statut: '', canal: 'tous', centre: '', danger: false, retard: false },
}

function minHeightPx(el: HTMLElement): number {
  return parseFloat(el.style.minHeight || '0')
}

describe('SessionsClient — cibles ≥44px', () => {
  it('les select rôle et centre atteignent 44px', () => {
    render(<SessionsClient {...sessionsProps} />)
    expect(minHeightPx(screen.getByLabelText('Filtrer par rôle'))).toBeGreaterThanOrEqual(44)
    expect(minHeightPx(screen.getByLabelText('Filtrer par centre'))).toBeGreaterThanOrEqual(44)
  })

  it('le conteneur du formulaire de dates atteint 44px', () => {
    render(<SessionsClient {...sessionsProps} />)
    const dateInput = screen.getByLabelText('Du')
    const form = dateInput.closest('form') as HTMLElement
    expect(minHeightPx(form)).toBeGreaterThanOrEqual(44)
  })

  it('le bouton « Appliquer les dates » atteint 44px', () => {
    render(<SessionsClient {...sessionsProps} />)
    const btn = screen.getByRole('button', { name: 'Appliquer les dates' })
    expect(minHeightPx(btn)).toBeGreaterThanOrEqual(44)
    expect(parseFloat(btn.style.minWidth || '0')).toBeGreaterThanOrEqual(44)
  })
})

describe('EscaladesClient — cibles ≥44px', () => {
  it('le select centre atteint 44px', () => {
    render(<EscaladesClient {...escaladesProps} />)
    expect(minHeightPx(screen.getByLabelText('Filtrer par centre'))).toBeGreaterThanOrEqual(44)
  })

  it('le bouton d\'action (Prendre en charge) atteint 44px', () => {
    render(<EscaladesClient {...escaladesProps} />)
    const btn = screen.getByRole('button', { name: /Prendre en charge/i })
    expect(minHeightPx(btn)).toBeGreaterThanOrEqual(44)
  })
})
