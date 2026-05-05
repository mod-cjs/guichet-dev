import { createHmac, createHash, timingSafeEqual } from 'crypto'

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

export function verifyHmacSignature(
  apiKey: string,
  timestamp: string,
  signature: string,
  body: string
): boolean {
  if (!apiKey || !timestamp || !signature) return false

  // Fenêtre de ±5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false

  const secret = PLATFORM_SECRETS[apiKey]
  if (!secret) return false

  const bodyHash = createHash('sha256').update(body).digest('hex')
  const message  = `${apiKey}\n${timestamp}\n${bodyHash}`
  const expected = createHmac('sha256', secret).update(message).digest('hex')

  // Les deux buffers doivent avoir la même longueur pour timingSafeEqual
  const sigBuf = Buffer.from(signature.padEnd(expected.length, '0').slice(0, expected.length), 'hex')
  const expBuf = Buffer.from(expected, 'hex')

  if (sigBuf.length !== expBuf.length) return false
  return timingSafeEqual(sigBuf, expBuf)
}

export function extractHmacHeaders(headers: Headers) {
  return {
    apiKey:    headers.get('x-cjs-api-key') ?? '',
    timestamp: headers.get('x-cjs-timestamp') ?? '',
    signature: headers.get('x-cjs-signature') ?? '',
  }
}
