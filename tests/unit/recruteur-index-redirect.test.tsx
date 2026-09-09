/**
 * GUIC-689 — `/recruteur` (sans slash) doit rediriger, pas répondre 404.
 *
 * Constat au balayage Playwright local (2026-07-30) : `/jeune` nu redirige
 * proprement (page index GUIC-446 → tableau de bord → gate middleware), mais
 * `/recruteur` nu tombe en 404 : la garde middleware ne couvre que
 * `/recruteur/...` et l'espace n'a pas de page racine.
 *
 * Attendu : page index symétrique à `src/app/jeune/page.tsx`, redirection vers
 * le point d'entrée `/recruteur/tableau-de-bord` (la gate middleware fait
 * ensuite son travail : login si anonyme, contrôle de rôle sinon).
 */
const redirectMock = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})

jest.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

describe('GUIC-689 — racine /recruteur', () => {
  it('redirige vers /recruteur/tableau-de-bord', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/app/recruteur/page') as { default: () => unknown }
    expect(() => mod.default()).toThrow('NEXT_REDIRECT:/recruteur/tableau-de-bord')
    expect(redirectMock).toHaveBeenCalledWith('/recruteur/tableau-de-bord')
  })
})

export {}
