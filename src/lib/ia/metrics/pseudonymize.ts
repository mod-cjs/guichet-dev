// Pseudonymisation CDP (GUIC-435 — jalon C, pré-requis avant envoi au juge LLM).
// Masque les PII directes d'un texte de transcript AVANT toute sortie vers Groq.
// Conservateur par défaut : mieux vaut sur-masquer que fuiter.

const RE_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
// Téléphone E.164 (+221XXXXXXXXX) et variantes longues de chiffres.
const RE_PHONE = /\+?\d[\d\s.-]{7,}\d/g
// Identifiants type UUID (cjs_uid, sessionId…).
const RE_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Remplace emails, téléphones et UUID par des marqueurs neutres. */
export function pseudonymizeText(input: string): string {
  return input
    .replace(RE_EMAIL, '[email]')
    .replace(RE_UUID, '[id]')
    .replace(RE_PHONE, '[téléphone]')
}
