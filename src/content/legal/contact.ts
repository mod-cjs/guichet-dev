/**
 * GUIC-605 — Coordonnées CDP, source unique.
 *
 * Les 3 documents sources (Drive, Mars 2026) divergeaient sur ces valeurs
 * parce qu'ils sont mutualisés entre 5 sites CJS. Les arbitrages PO du
 * 2026-08-14 sont figés ici pour que les 5 pages légales ne puissent pas
 * repartir en contradiction — c'est précisément ce qu'un contrôle CDP relève.
 *
 * Divergences tranchées :
 * - **Délai de réponse** : 30 j (politique Art. 9) vs 15 j (page Vos droits)
 *   → **15 jours** partout.
 * - **Adresse** : CDEPS de Guédiawaye (Art. 1) vs SICAP Point E (Vos droits)
 *   → **CDEPS de Guédiawaye**.
 * - **Téléphone** : +221 33 877 78 05 (politique + consentement) vs
 *   +221 33 824 83 83 (notice §5) → **+221 33 877 78 05** (2 sources sur 3).
 *
 * Toute évolution de ces valeurs doit être répercutée dans les .docx du Drive.
 */

export const CONTACT_CDP = {
  organisme: 'Consortium Jeunesse Sénégal (CJS)',
  ninea: '00847588 / OX9',
  adresse: 'CDEPS de Guédiawaye, Guédiawaye 10200, Dakar, Sénégal',
  telephone: '+221 33 877 78 05',
  emailGeneral: 'contact@consortiumjeunessesenegal.org',
  siteWeb: 'https://www.consortiumjeunessesenegal.org',
  representantLegal: 'Samba Allé DIOUF, Directeur des Opérations',
  responsableDonnees: 'Samba Allé DIOUF',
  emailDonnees: 'sdiouf@consortiumjeunessesenegal.org',
  /** Arbitrage PO 2026-08-14 : 15 jours, valeur la plus favorable à l'utilisateur. */
  delaiReponse: '15 jours',
} as const

/** Autorité de contrôle — recours de l'utilisateur. */
export const AUTORITE_CDP = {
  nom: 'Commission de Protection des Données Personnelles (CDP)',
  site: 'https://cdp.sn',
  email: 'contactcdp@cdp.sn',
  adresse: 'Almadies, Dakar, Sénégal',
} as const

/** Loi de référence, citée à l'identique dans les 4 documents. */
export const LOI_CDP = 'Loi n° 2008-12 du 25 janvier 2008'

/**
 * Sites couverts par le responsable de traitement.
 * Corrige la typo `guichetjeunesse.ss` de l'Article 1 (l'Article 2 du même
 * document écrit correctement `.sn`) et la duplication de `guichetjeunesse.sn`
 * du bandeau cookies.
 */
export const SITES_COUVERTS = [
  'https://www.guichetjeunesse.sn',
  'https://edupop.sn',
  'https://brm.consortiumjeunessesenegal.org',
  'https://www.consortiumjeunessesenegal.org',
  'https://consortiumjeunessesenegal.odoo.com',
] as const

/** Phrase de contact réutilisée par les 4 documents. */
export const PHRASE_EXERCICE_DROITS =
  `Pour exercer vos droits, contactez ${CONTACT_CDP.responsableDonnees} — ` +
  `${CONTACT_CDP.emailDonnees} — ${CONTACT_CDP.telephone}. ` +
  `Délai de réponse : ${CONTACT_CDP.delaiReponse} à compter de la réception de votre demande.`
