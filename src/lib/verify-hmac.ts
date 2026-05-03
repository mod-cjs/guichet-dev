import { createHmac, createHash, timingSafeEqual } from 'crypto'

// Secrets par plateforme source : { apiKey → apiSecret }
// Chargés depuis les variables d'environnement
export const PLATFORM_SECRETS: Record<string, string> = {
  [process.env.BRM_API_KEY ?? '']:      process.env.BRM_API_SECRET ?? '',
  [process.env.CENTRES_API_KEY ?? '']:  process.env.CENTRES_API_SECRET ?? '',
  [process.env.MOODLE_API_KEY ?? '']:   process.env.MOODLE_API_SECRET ?? '',
  [process.env.EDUPOP_API_KEY ?? '']:   process.env.EDUPOP_API_SECRET ?? '',
}

export function verifyHmacSignature(
  apiKey: string,
  timestamp: string,
  signature: string,
  body: string
): boolean {
  // Fenêtre de ±5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) return false

  const secret = PLATFORM_SECRETS[apiKey]
  if (!secret) return false

  const bodyHash = createHash('sha256').update(body).digest('hex')
  const message  = `${apiKey}\n${timestamp}\n${bodyHash}`
  const expected = createHmac('sha256', secret).update(message).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

// Middleware helper pour les routes d'interconnexion
export function extractHmacHeaders(headers: Headers) {
  return {
    apiKey:    headers.get('x-cjs-api-key') ?? '',
    timestamp: headers.get('x-cjs-timestamp') ?? '',
    signature: headers.get('x-cjs-signature') ?? '',
  }
}
