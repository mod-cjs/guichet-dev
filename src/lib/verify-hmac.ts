import { createHmac, createHash, timingSafeEqual } from 'crypto'

const HEX_RE = /^[0-9a-fA-F]+$/

function buildSecrets(): Record<string, string> {
  const pairs: [string | undefined, string | undefined][] = [
    [process.env.BRM_API_KEY,     process.env.BRM_API_SECRET],
    [process.env.CENTRES_API_KEY, process.env.CENTRES_API_SECRET],
    [process.env.MOODLE_API_KEY,  process.env.MOODLE_API_SECRET],
    [process.env.EDUPOP_API_KEY,  process.env.EDUPOP_API_SECRET],
  ]
  const map: Record<string, string> = {}
  for (const [key, secret] of pairs) {
    if (key && secret) map[key] = secret
  }
  return map
}

const PLATFORM_SECRETS = buildSecrets()

/**
 * Vérifie une signature HMAC-SHA256 (hex) émise par une plateforme machine.
 *
 * Sécurité (GUIC-242) :
 * - Rejet immédiat si signature/timestamp/apiKey vides.
 * - Rejet immédiat si signature contient des caractères non-hex
 *   (Buffer.from('zz', 'hex') drop silencieusement sinon → faux positif possible).
 * - Rejet immédiat si signature.length !== expected.length.
 *   AUCUN padding ni slice : une signature courte ne doit jamais être étendue
 *   jusqu'à la longueur attendue, sinon timingSafeEqual peut renvoyer true
 *   sur une comparaison structurellement valide mais cryptographiquement fausse.
 * - Comparaison timing-safe sur buffers de longueur identique.
 */
export function verifyHmacSignature(
  apiKey: string,
  timestamp: string,
  signature: string,
  body: string
): boolean {
  if (!apiKey || !timestamp || !signature) return false
  if (!HEX_RE.test(signature)) {
    console.warn('[verify-hmac] rejet : signature non-hex')
    return false
  }

  // Fenêtre de ±5 minutes
  const now = Math.floor(Date.now() / 1000)
  const ts  = parseInt(timestamp, 10)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false

  const secret = PLATFORM_SECRETS[apiKey]
  if (!secret) return false

  const bodyHash = createHash('sha256').update(body).digest('hex')
  const message  = `${apiKey}\n${timestamp}\n${bodyHash}`
  const expected = createHmac('sha256', secret).update(message).digest('hex')

  // Strict : pas de padding. Longueur exacte requise.
  if (signature.length !== expected.length) {
    console.warn('[verify-hmac] rejet : longueur signature invalide')
    return false
  }

  try {
    const sigBuf = Buffer.from(signature, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    return timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

export function extractHmacHeaders(headers: Headers) {
  return {
    apiKey:    headers.get('x-cjs-api-key') ?? '',
    timestamp: headers.get('x-cjs-timestamp') ?? '',
    signature: headers.get('x-cjs-signature') ?? '',
  }
}
