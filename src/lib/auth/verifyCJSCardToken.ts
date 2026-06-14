/**
 * GUIC-387 — Vérif du JWT QR de la MyCJSCard côté scanner staff.
 * ADR-002 : HS256 rotatif 15 min, secret `JWT_CJS_CARD_SECRET`.
 *
 * Renvoie le payload décodé ou `null` (signature/exp invalide, malformé).
 * Distingue `expired` du reste via {@link CJSCardTokenError}.
 */

import { jwtVerify, errors as joseErrors } from 'jose'

export interface CJSCardPayload {
  sub: string
  nonce: string
  iat: number
  exp: number
}

export type CJSCardTokenFailure = 'expired' | 'invalid'

export class CJSCardTokenError extends Error {
  constructor(public reason: CJSCardTokenFailure) {
    super(`CJSCardToken: ${reason}`)
    this.name = 'CJSCardTokenError'
  }
}

function getSecret(): Uint8Array {
  const s = process.env.JWT_CJS_CARD_SECRET
  if (!s) throw new Error('JWT_CJS_CARD_SECRET manquant')
  return new TextEncoder().encode(s)
}

/**
 * Vérifie le JWT QR. Retourne le payload si valide, sinon `null`.
 * Le caller peut catch {@link CJSCardTokenError} pour distinguer `expired`.
 */
export async function verifyCJSCardToken(
  token: string,
): Promise<CJSCardPayload | null> {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    return null
  }
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    })
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.nonce !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }
    return {
      sub:   payload.sub,
      nonce: payload.nonce,
      iat:   payload.iat,
      exp:   payload.exp,
    }
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      throw new CJSCardTokenError('expired')
    }
    return null
  }
}
