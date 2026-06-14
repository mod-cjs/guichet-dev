/**
 * GUIC-389 — Source unique du secret HS256 pour le JWT QR MyCJSCard.
 *
 * Émetteur (`src/app/api/cjs-card/qr-token/route.ts`) ET vérifieur
 * (`src/lib/auth/verifyCJSCardToken.ts`) doivent passer par ce module
 * pour garantir que la signature et la vérification utilisent EXACTEMENT
 * le même secret — sinon, divergence silencieuse (100% des check-ins KO).
 *
 * Comportement :
 *  - prod : `JWT_CJS_CARD_SECRET` requis → throw au boot si absent (fail-fast).
 *  - dev/test : fallback DÉTERMINISTE + warning console (les tokens survivent
 *    aux redémarrages, alors qu'un `randomBytes` au boot cassait l'auto-refresh).
 *
 * Le secret prod doit être configuré sur Vercel (mouhammadouod preview + prod).
 */

const DEV_FALLBACK_SECRET =
  'DEV_INSECURE_FALLBACK_DO_NOT_USE_IN_PROD_32_CHARS'

let _warned = false

export function getCJSCardSecret(): Uint8Array {
  const raw = process.env.JWT_CJS_CARD_SECRET
  if (raw && raw.length > 0) {
    return new TextEncoder().encode(raw)
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[cjs-card-secret] JWT_CJS_CARD_SECRET requis en production',
    )
  }
  if (!_warned) {
    console.warn(
      '[cjs-card-secret] JWT_CJS_CARD_SECRET absent — fallback dev déterministe. Configure la variable Vercel pour la prod.',
    )
    _warned = true
  }
  return new TextEncoder().encode(DEV_FALLBACK_SECRET)
}
