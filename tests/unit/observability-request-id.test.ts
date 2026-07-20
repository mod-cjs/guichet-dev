/**
 * @jest-environment node
 *
 * GUIC-578 — Résolution de l'identifiant de corrélation (requestId).
 *
 * Un requestId relie tous les logs d'une même requête (app + reverse proxy). Il vient du proxy
 * (en-tête `x-request-id`, source de vérité en prod) ; à défaut, on en génère un. Sans lui,
 * les logs sont des lignes éparses, pas une histoire.
 */
import { REQUEST_ID_HEADER, resolveRequestId, isValidRequestId } from '@/lib/observability/request-id'

/** Sac d'en-têtes façon route handler (`Headers` Web). */
function headers(init?: Record<string, string>): Headers {
  return new Headers(init)
}

/**
 * Sac d'en-têtes façon hook `onRequestError` : un OBJET SIMPLE (`NodeJS.Dict`), pas un `Headers`.
 *
 * GUIC-617 — c'est la forme qui a produit le bug C1 en prod (`.get()` sur un objet simple), et
 * c'est la seule qui permet de tester une valeur hostile : `new Headers({'x-request-id':
 * 'abc\ndef'})` LÈVE à la construction (« invalid header value »). L'ancien test faisait tout
 * passer par `new Headers` et échouait donc dans son propre échafaudage, sans jamais atteindre
 * le code teste.
 */
function dict(init: Record<string, string | string[]>): Record<string, string | string[]> {
  return init
}

describe('GUIC-578 — resolveRequestId', () => {
  it('réutilise le requestId fourni par le proxy', () => {
    const id = '11111111-2222-3333-4444-555555555555'
    expect(resolveRequestId(headers({ [REQUEST_ID_HEADER]: id }))).toBe(id)
  })

  it('accepte aussi le sac d’en-têtes objet simple du hook onRequestError (anti-régression C1)', () => {
    const id = '11111111-2222-3333-4444-555555555555'
    expect(resolveRequestId(dict({ [REQUEST_ID_HEADER]: id }))).toBe(id)
    // Node peut livrer une valeur multiple : on prend la première, sans planter.
    expect(resolveRequestId(dict({ [REQUEST_ID_HEADER]: [id, 'autre'] }))).toBe(id)
  })

  it('en génère un valide quand l’en-tête est absent', () => {
    const id = resolveRequestId(headers())
    expect(isValidRequestId(id)).toBe(true)
  })

  it('deux générations donnent des identifiants différents', () => {
    expect(resolveRequestId(headers())).not.toBe(resolveRequestId(headers()))
  })

  it('rejette et régénère un requestId entrant aberrant (anti-injection de log)', () => {
    // Un en-tête client hostile ne doit pas polluer les logs avec des sauts de ligne, etc.
    // Sac OBJET SIMPLE : `new Headers` refuserait cette valeur (cf. `dict` ci-dessus).
    const sale = 'abc\ndef INJECTION'
    const id = resolveRequestId(dict({ [REQUEST_ID_HEADER]: sale }))
    expect(id).not.toBe(sale)
    expect(id).not.toContain('\n')
    expect(isValidRequestId(id)).toBe(true)
  })

  it('isValidRequestId accepte un UUID/token propre, refuse le reste', () => {
    expect(isValidRequestId('11111111-2222-3333-4444-555555555555')).toBe(true)
    expect(isValidRequestId('abc123-DEF_456')).toBe(true) // token alphanumérique borné
    expect(isValidRequestId('')).toBe(false)
    expect(isValidRequestId('a b')).toBe(false) // espace
    expect(isValidRequestId('x'.repeat(200))).toBe(false) // trop long
    expect(isValidRequestId('a\nb')).toBe(false) // saut de ligne
  })
})
