'use client'

// GUIC-712 — Bandeau de consentement, monté une seule fois dans le layout racine.
//
// CONTRAT — implémentation à venir (commit GREEN).

export interface CookieConsentProps {
  /** Ouvre directement le panneau de préférences (page « Cookies »). */
  ouvrirPreferences?: boolean
}

export function CookieConsent(_props: CookieConsentProps = {}) {
  return null
}
