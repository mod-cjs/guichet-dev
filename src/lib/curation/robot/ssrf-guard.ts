import { lookup } from 'node:dns/promises'

/**
 * GUIC-597 — US-2 : garde anti-SSRF AU MOMENT DU FETCH (parade DNS-rebinding).
 *
 * La validation d'URL d'US-1 (`sources-veille-schema`) ne peut bloquer que les hôtes
 * littéraux internes. Ici, avant de fetcher, on résout le DNS et on refuse si UNE des
 * IP résolues est privée/interne — un domaine public qui pointe vers 169.254.169.254
 * (metadata cloud) est ainsi bloqué. Fail-closed : toute erreur de résolution = refus.
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
    const o = Number(p)
    if (!Number.isInteger(o) || o < 0 || o > 255) return null
    n = n * 256 + o
  }
  return n >>> 0
}

/** Vraie pour toute IP loopback / privée / link-local / réservée (v4 et v6). */
export function estIpInterne(ip: string): boolean {
  const brut = ip.trim().toLowerCase()

  // IPv6
  if (brut.includes(':')) {
    if (brut === '::1' || brut === '::') return true
    if (brut.startsWith('fe80') || brut.startsWith('fc') || brut.startsWith('fd')) return true // link-local + ULA
    // IPv4-mapped ::ffff:a.b.c.d
    const m = brut.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (m) return estIpInterne(m[1])
    return false
  }

  const n = ipv4EnEntier(brut)
  if (n === null) return true // forme non reconnue → refus prudent (fail-closed)

  const dans = (a: string, bits: number) => {
    const base = ipv4EnEntier(a)!
    const masque = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return (n & masque) === (base & masque)
  }
  return (
    dans('0.0.0.0', 8) || // "this host"
    dans('10.0.0.0', 8) || // RFC1918
    dans('127.0.0.0', 8) || // loopback
    dans('169.254.0.0', 16) || // link-local (metadata cloud)
    dans('172.16.0.0', 12) || // RFC1918
    dans('192.168.0.0', 16) || // RFC1918
    dans('100.64.0.0', 10) // CGNAT
  )
}

/** Résout l'hôte de `url` et n'autorise le fetch que si TOUTES les IP sont publiques. */
export async function urlFetchable(url: string, resolver: Resolver = resoudreDefaut): Promise<boolean> {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return false
  }
  try {
    const ips = await resolver(hostname)
    if (!ips.length) return false
    return ips.every((ip) => !estIpInterne(ip))
  } catch {
    return false // fail-closed : résolution impossible → refus
  }
}

const resoudreDefaut: Resolver = (h) => resolveurDns(h)
