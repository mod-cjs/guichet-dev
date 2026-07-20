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

  // Durcissement : IPv6 fail-closed + formes mapped exotiques.
  it.each([
    '::ffff:7f00:1', // ::ffff:127.0.0.1 en hexadécimal
    '::ffff:a9fe:a9fe', // ::ffff:169.254.169.254 (metadata) en hex
    '::127.0.0.1', // IPv4-compatible
    'fd00:ec2::254', // ULA (metadata AWS IPv6)
    '2002:7f00:1::', // 6to4 encapsulant 127.0.0.1
    '2002:a9fe:a9fe::', // 6to4 encapsulant 169.254.169.254 (metadata)
    '64:ff9b::7f00:1', // NAT64 well-known encapsulant 127.0.0.1
    'pas-une-ip', // non parsable → fail-closed
    ':::::', // IPv6 malformé → fail-closed
  ])('interne/fail-closed : %s', (ip) => expect(estIpInterne(ip)).toBe(true))
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
