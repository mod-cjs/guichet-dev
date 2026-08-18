/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — SessionsClient, retour visuel pendant la navigation par
 * filtre (GUIC-259, R-5). `isPending` de `useTransition` était jeté ; il doit
 * piloter un état visuel (aria-busy + opacité réduite) sur la liste.
 */
import { render, screen } from '@testing-library/react'

jest.mock('react', () => {
  const actual = jest.requireActual('react')
  return { ...actual, useTransition: () => [true, (cb: () => void) => cb()] }
})
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/admin/yaye/sessions',
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SessionsClient } = require('@/app/admin/yaye/sessions/SessionsClient')

it('applique aria-busy + opacité réduite sur la liste quand une navigation de filtre est en cours (isPending)', () => {
  render(
    <SessionsClient
      rows={[]}
      summary={{ sessions: 0, escalades: 0, erreurs: 0 }}
      total={0}
      currentPage={1}
      totalPages={1}
      centres={[]}
      roles={[]}
      filtres={{ from: '2026-06-01', to: '2026-06-30', canal: 'tous', q: '', filtre: '', role: '', centre: '' }}
    />,
  )
  const list = screen.getByTestId('sessions-table')
  expect(list).toHaveAttribute('aria-busy', 'true')
  expect(parseFloat(list.style.opacity || '1')).toBeLessThan(1)
})
