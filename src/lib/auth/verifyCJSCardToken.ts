/**
 * GUIC-387 / GUIC-389 — Vérif du JWT QR de la MyCJSCard côté scanner staff.
 * ADR-002 : HS256 rotatif 15 min, secret `JWT_CJS_CARD_SECRET`.
 *
 * Renvoie le payload décodé ou `null` (signature/exp invalide, malformé,
 * kid inattendu, scope inattendu). Distingue `expired` du reste via
 * {@link CJSCardTokenError}.
 *
 * GUIC-389 :
 *  - Secret obtenu via `getCJSCardSecret()` (source unique partagée avec
 *    l'émetteur — fini la divergence prod/dev).
 *  - Vérifie `kid === 'cjs-checkin-v1'` (sinon → null).
 *  - Vérifie `scope === 'checkin'` (sinon → null).
 */

import { jwtVerify, errors as joseErrors } from 'jose'
import { getCJSCardSecret } from './cjs-card-secret'

export const EXPECTED_KID = 'cjs-checkin-v1'
export const EXPECTED_SCOPE = 'checkin'

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
    const { payload, protectedHeader } = await jwtVerify(token, getCJSCardSecret(), {
      algorithms: ['HS256'],
    })
    // GUIC-389 : verrouille kid + scope pour empêcher la confusion entre
    // différents tokens signés avec le même secret.
    if (protectedHeader.kid !== EXPECTED_KID) {
      return null
    }
    if (payload.scope !== EXPECTED_SCOPE) {
      return null
    }
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
