/**
 * @jest-environment jsdom
 *
 * Panel admin Yaye — EscaladesClient, retour visuel pendant la navigation par
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
  usePathname: () => '/admin/yaye/escalades',
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EscaladesClient } = require('@/app/admin/yaye/escalades/EscaladesClient')

it('applique aria-busy + opacité réduite sur la liste quand une navigation de filtre est en cours (isPending)', () => {
  render(
    <EscaladesClient
      rows={[]}
      counts={{ en_attente: 0, prise_en_charge: 0, resolue: 0 }}
      total={0}
      currentPage={1}
      totalPages={1}
      centres={[]}
      staff={[]}
      currentUid=""
      filtres={{ statut: '', canal: 'tous', centre: '', danger: false, retard: false, q: '', from: '', to: '' }}
    />,
  )
  const list = screen.getByTestId('escalades-table')
  expect(list).toHaveAttribute('aria-busy', 'true')
  expect(parseFloat(list.style.opacity || '1')).toBeLessThan(1)
})
