/**
 * GUIC-702 — heuristique de signaux de modération (pure, testée, 0 champ en base).
 *
 * Repère des motifs de risque sur une offre brouillon pour AIDER le modérateur —
 * jamais pour bloquer. Deux niveaux :
 *   - `crit` : forte présomption d'offre-arnaque (frais demandés, n° perso, argent facile) ;
 *   - `soft` : point de vigilance (partenaire recruteur non vérifié).
 *
 * Conçu pour ZÉRO faux-positif sur une offre saine : les montants d'indemnité
 * (« 150 000 FCFA ») ne déclenchent rien, seuls les numéros mobiles sénégalais
 * (9 chiffres, préfixe 70/75/76/77/78) comptent comme « n° perso ».
 */

export type NiveauSignal = 'crit' | 'soft'
export interface Signal {
  niveau: NiveauSignal
  motif: string
}

export interface OffreSignalable {
  titre: string
  description: string
  remuneration?: string | null
  /** Provenance dérivée — le signal « partenaire non vérifié » ne vaut que pour un dépôt recruteur. */
  source: 'recruteur' | 'veille' | 'admin'
  /** `Organisation.estVerifie` du partenaire émetteur (défaut false si absent). */
  partenaireVerifie: boolean
}

// Frais/versement exigés du candidat — motif d'arnaque le plus courant au Sénégal.
const RE_FRAIS = /frais\b[^.\n]{0,12}(?:inscription|dossier|adh[ée]sion|scolarit[ée])/i
const RE_VERSER = /(?:à\s+)?(?:verser|payer|versement)\b[^.]{0,40}(?:avant|obligatoire|inscription|entretien)/i
// Numéro mobile sénégalais dans le corps (contournement du canal officiel).
const RE_TEL = /7[05678]\d{7}/
// Formules d'argent facile / travail à domicile rémunéré.
const RE_ARNAQUE = /(?:argent\s+facile|gagnez\s+.{0,20}par\s+jour|revenu\s+garanti|travail\s+.{0,15}domicile\s+r[ée]mun)/i

/** Détecte les signaux d'une offre. Advisoire — jamais bloquant. */
export function detecterSignaux(o: OffreSignalable): Signal[] {
  const signaux: Signal[] = []
  const texte = `${o.titre}\n${o.description}\n${o.remuneration ?? ''}`
  const compact = texte.replace(/[\s.\-]/g, '')

  if (RE_FRAIS.test(texte) || RE_VERSER.test(texte)) {
    signaux.push({ niveau: 'crit', motif: 'Frais d’inscription / de dossier demandés' })
  }
  if (RE_TEL.test(compact)) {
    signaux.push({ niveau: 'crit', motif: 'Numéro de téléphone personnel dans la description' })
  }
  if (RE_ARNAQUE.test(texte)) {
    signaux.push({ niveau: 'crit', motif: 'Formulation de type « argent facile »' })
  }
  if (o.source === 'recruteur' && !o.partenaireVerifie) {
    signaux.push({ niveau: 'soft', motif: 'Partenaire non vérifié' })
  }
  return signaux
}

/** Niveau agrégé d'une carte : crit prime sur soft, sinon aucun. */
export function niveauCarte(signaux: Signal[]): NiveauSignal | null {
  if (signaux.some((s) => s.niveau === 'crit')) return 'crit'
  if (signaux.some((s) => s.niveau === 'soft')) return 'soft'
  return null
}
