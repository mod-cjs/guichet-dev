/**
 * GUIC-597 — US-2 : garde anti-SSRF AU FETCH (parade DNS-rebinding).
 * La validation d'URL d'US-1 ne bloque que les hôtes littéraux internes ; ici on
 * résout le DNS et on refuse si l'IP résolue est privée/interne — un domaine public
 * qui pointe vers 169.254.169.254 doit être rejeté au moment du fetch.
 */
import { estIpInterne, urlFetchable } from '@/lib/curation/robot/ssrf-guard'

describe('GUIC-597 — estIpInterne', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '192.168.0.1',
    '172.16.5.4',
    '169.254.169.254', // metadata cloud
    '::1',
    'fc00::1',
    'fe80::1',
    '0.0.0.0',
  ])('interne : %s', (ip) => expect(estIpInterne(ip)).toBe(true))

  it.each(['8.8.8.8', '41.82.10.5', '2001:4860:4860::8888'])('public : %s', (ip) =>
    expect(estIpInterne(ip)).toBe(false),
  )
})

describe('GUIC-597 — urlFetchable (résolution DNS injectée)', () => {
  it('refuse un domaine public qui résout vers une IP interne (rebinding)', async () => {
    const resolver = async () => ['169.254.169.254']
    expect(await urlFetchable('https://piege-public.sn/liste', resolver)).toBe(false)
  })

  it('refuse si UNE des IP résolues est interne', async () => {
    const resolver = async () => ['41.82.10.5', '10.0.0.9']
    expect(await urlFetchable('https://multi.sn/', resolver)).toBe(false)
  })

  it('autorise un domaine qui résout vers des IP publiques', async () => {
    const resolver = async () => ['41.82.10.5']
    expect(await urlFetchable('https://exemple.sn/liste', resolver)).toBe(true)
  })

  it('refuse si la résolution échoue (fail-closed)', async () => {
    const resolver = async () => {
      throw new Error('ENOTFOUND')
    }
    expect(await urlFetchable('https://introuvable.sn/', resolver)).toBe(false)
  })
})
