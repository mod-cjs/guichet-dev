// Vérifie la liste des redirects 301 configurés dans next.config.ts
// (Phase 0 refonte v2 — rename /evenements → /agenda)

import nextConfig from '../../next.config'

describe('next.config redirects', () => {
  it('contient les redirects 301 /evenements → /agenda', async () => {
    const redirectsFn = nextConfig.redirects
    expect(typeof redirectsFn).toBe('function')

    const list = await (redirectsFn as () => Promise<Array<{ source: string; destination: string; permanent: boolean }>>)()

    const direct = list.find(r => r.source === '/evenements')
    expect(direct).toBeDefined()
    expect(direct?.destination).toBe('/agenda')
    expect(direct?.permanent).toBe(true)

    const wildcard = list.find(r => r.source === '/evenements/:path*')
    expect(wildcard).toBeDefined()
    expect(wildcard?.destination).toBe('/agenda/:path*')
    expect(wildcard?.permanent).toBe(true)
  })
})
