import { lookup } from 'node:dns/promises'

/**
 * GUIC-597 — US-2 : garde anti-SSRF AU MOMENT DU FETCH.
 *
 * La validation d'URL d'US-1 ne bloque que les hôtes littéraux internes. Ici on résout
 * le DNS et on refuse si UNE des IP résolues est interne. Le client HTTP (http-client.ts)
 * ÉPINGLE ensuite l'IP validée pour la connexion → pas de re-résolution (parade
 * DNS-rebinding / TOCTOU). Fail-closed : toute forme non classée = interne.
 */

export type Resolver = (hostname: string) => Promise<string[]>

/** Résolveur DNS réel (toutes les adresses A/AAAA). */
export const resolveurDns: Resolver = async (hostname) => {
  const adresses = await lookup(hostname, { all: true })
  return adresses.map((a) => a.address)
}

function ipv4EnEntier(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const o = Number(p)
    if (o > 255) return null
    n = n * 256 + o
  }
  return n >>> 0
}

/** Expanse une IPv6 (avec `::` et éventuel IPv4 embarqué) en 16 octets, ou null. */
function ipv6EnOctets(ip: string): number[] | null {
  let s = ip.trim().toLowerCase()
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1)
  s = s.replace(/%.*$/, '') // retire le scope (fe80::1%eth0)
  if (!s.includes(':')) return null

  const partsDouble = s.split('::')
  if (partsDouble.length > 2) return null

  const expandCote = (cote: string): number[] | null => {
    if (!cote) return []
    const groupes = cote.split(':')
    const octets: number[] = []
    for (let i = 0; i < groupes.length; i++) {
      const g = groupes[i]
      // Dernier groupe : IPv4 embarqué possible (::ffff:127.0.0.1).
      if (g.includes('.')) {
        if (i !== groupes.length - 1) return null
        const v4 = ipv4EnEntier(g)
        if (v4 === null) return null
        octets.push((v4 >>> 24) & 0xff, (v4 >>> 16) & 0xff, (v4 >>> 8) & 0xff, v4 & 0xff)
        continue
      }
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null
      const v = parseInt(g, 16)
      octets.push((v >> 8) & 0xff, v & 0xff)
    }
    return octets
  }

  const gauche = expandCote(partsDouble[0])
  const droite = expandCote(partsDouble.length === 2 ? partsDouble[1] : '')
  if (gauche === null || droite === null) return null

  if (partsDouble.length === 2) {
    const manquant = 16 - gauche.length - droite.length
    if (manquant < 0) return null
    return [...gauche, ...new Array(manquant).fill(0), ...droite]
  }
  return gauche.length === 16 ? gauche : null
}

/** Vraie pour toute IP loopback / privée / link-local / réservée (v4 et v6). */
export function estIpInterne(ip: string): boolean {
  const brut = ip.trim().toLowerCase()

  if (brut.includes(':')) {
    const o = ipv6EnOctets(brut)
    if (o === null) return true // non parsable → fail-closed
    if (o.every((b) => b === 0)) return true // :: (unspecified)
    if (o.slice(0, 15).every((b) => b === 0) && o[15] === 1) return true // ::1 loopback
    if ((o[0] & 0xfe) === 0xfc) return true // fc00::/7 ULA
    if (o[0] === 0xfe && (o[1] & 0xc0) === 0x80) return true // fe80::/10 link-local
    // IPv4-mapped ::ffff:a.b.c.d  et  IPv4-compatible ::a.b.c.d
    const mapped = o.slice(0, 10).every((b) => b === 0) && o[10] === 0xff && o[11] === 0xff
    const compat = o.slice(0, 12).every((b) => b === 0)
    if (mapped || compat) return estIpInterne(o.slice(12).join('.'))
    // 6to4 (2002::/16) : IPv4 encapsulée en octets 2-5 → re-classer.
    if (o[0] === 0x20 && o[1] === 0x02) return estIpInterne(o.slice(2, 6).join('.'))
    // NAT64 well-known (64:ff9b::/96) : IPv4 en octets 12-15.
    if (o[0] === 0x00 && o[1] === 0x64 && o[2] === 0xff && o[3] === 0x9b) {
      return estIpInterne(o.slice(12).join('.'))
    }
    return false // IPv6 globale valide
  }

  const n = ipv4EnEntier(brut)
  if (n === null) return true // forme non reconnue → fail-closed

  const dans = (a: string, bits: number) => {
    const base = ipv4EnEntier(a)!
    const masque = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return (n & masque) === (base & masque)
  }
  return (
    dans('0.0.0.0', 8) ||
    dans('10.0.0.0', 8) ||
    dans('127.0.0.0', 8) ||
    dans('169.254.0.0', 16) || // link-local (metadata cloud)
    dans('172.16.0.0', 12) ||
    dans('192.168.0.0', 16) ||
    dans('100.64.0.0', 10) // CGNAT
  )
}

/**
 * Résout l'hôte et renvoie la première IP publique validée (à épingler pour la connexion),
 * ou null si l'hôte est interne / irrésolu. Toutes les IP résolues doivent être publiques.
 */
export async function ipPubliqueValidee(
  url: string,
  resolver: Resolver = resolveurDns,
): Promise<string | null> {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return null
  }
  try {
    const ips = await resolver(hostname)
    if (!ips.length) return null
    if (ips.some((ip) => estIpInterne(ip))) return null // une seule interne → refus global
    return ips[0]
  } catch {
    return null // fail-closed
  }
}

/** Rétro-compat : booléen d'autorisation (utilisé par les tests unitaires). */
export async function urlFetchable(url: string, resolver: Resolver = resolveurDns): Promise<boolean> {
  return (await ipPubliqueValidee(url, resolver)) !== null
}
