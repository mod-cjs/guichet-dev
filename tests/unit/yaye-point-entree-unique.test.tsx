/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Règle NON NÉGOCIABLE du handoff v5 : « Un seul point d'entrée IA
 * permanent par écran : le bouton flottant ».
 *
 * Historique de ce test : un audit avait signalé la règle violée (pill Yaye en
 * topbar + FAB), j'ai conclu à un faux positif après avoir lu
 * `{onYayeClick ? (…)` sans lire la branche `else` — qui rend un `<Link
 * href="/jeune/yaye">`. La pill est donc TOUJOURS affichée sur mobile, en plus
 * du FAB, et les deux n'ouvrent même pas la même expérience (page plein écran
 * vs drawer). La référence est explicite : `design-guichet-v5/phone.jsx:106`
 * — « La pastille "Y IA" a été retirée : le bouton flottant est le point
 * d'entrée unique et permanent vers Yaye ».
 *
 * Une lecture de code ne suffisait pas : ce test monte le composant et COMPTE.
 */
import { render, screen } from '@testing-library/react'

import { AppTopbar } from '@/components/layout/AppTopbar'

jest.mock('next/navigation', () => ({
  usePathname: () => '/jeune/tableau-de-bord',
  useRouter: () => ({ push: jest.fn() }),
}))

const session = {
  cjsUid: 'u1',
  prenom: 'Awa',
  nom: 'Ndiaye',
  email: 'awa@cjs.sn',
  telephone: '+221770000000',
  region: 'Thies',
  roles: ['beneficiaire'],
  onboardingComplete: true,
  expiresAt: Date.now() / 1000 + 3600,
  accessToken: '',
  refreshToken: '',
}

describe('GUIC-689 — un seul point d’entrée IA permanent', () => {
  it('la topbar mobile n’expose AUCUNE entrée Yaye (le FAB est l’unique point d’entrée)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<AppTopbar session={session as any} unread={0} hasPhoto={false} />)
    const entrees = screen.queryAllByLabelText(/yaye/i)
    expect(entrees).toHaveLength(0)
  })
})
