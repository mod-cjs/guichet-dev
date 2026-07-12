// Checks DÉTERMINISTES de qualité conversationnelle Yaye (jalon E+, éval locale).
// Purs (aucune I/O) → testables en CI et réutilisés par le runner local d'éval.
//
// Ils ciblent les 3 défauts terrain observés :
//  1. « on voit que ce n'est pas humain »  → heuristiques persona (concision, tutoiement,
//     formules creuses, énumération d'offres en prose).
//  2. justesse des outils                   → 1er outil attendu + présence des arguments.
//  3. répétitions / mêmes cards             → similarité inter-réponses + doublons de cards.

import type { YayeBlock } from '../../blocks'

/** 1er outil appelé (= intention détectée), ou null si réponse directe. */
export function firstTool(toolsUsed: string[]): string | null {
  return toolsUsed.length > 0 ? toolsUsed[0] : null
}

// ── Persona / naturalité ──────────────────────────────────────────────────────

/** Formules creuses / « robotiques » à pénaliser (non exhaustif, minuscule). */
export const ROBOTIC_FILLERS = [
  "n'hésite pas",
  "n'hésitez pas",
  'plein de choses',
  'je suis là pour',
  'je reste à ta disposition',
  'je reste à votre disposition',
  'comment puis-je vous aider',
  'en tant qu',
  'je suis une ia',
  "je suis un assistant",
  'bien sûr !',
]

export function roboticFillers(text: string): string[] {
  const t = text.toLowerCase()
  return ROBOTIC_FILLERS.filter((f) => t.includes(f))
}

/** Compte approximatif de phrases (segmentation sur . ! ? … et sauts de ligne). */
export function countSentences(text: string): number {
  const parts = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return parts.length
}

/** Détecte le tutoiement (persona Yaye = grande sœur qui tutoie). */
export function usesTutoiement(text: string): boolean {
  return /\b(tu|t'|ton|ta|tes|toi|te)\b/i.test(text)
}

/** Détecte le vouvoiement (à éviter pour Yaye). */
export function usesVouvoiement(text: string): boolean {
  return /\b(vous|votre|vos)\b/i.test(text)
}

/**
 * Détecte l'énumération EN PROSE d'offres : la réponse recopie des titres de cards.
 * On considère qu'un titre est « recopié » si ≥ 4 mots consécutifs du titre apparaissent
 * dans le texte. Les détails appartiennent aux cards, pas au texte (persona = concision).
 */
export function enumeratesOffers(text: string, offerTitles: string[]): boolean {
  const t = text.toLowerCase()
  return offerTitles.some((titre) => {
    const mots = titre.toLowerCase().split(/\s+/).filter(Boolean)
    if (mots.length < 4) return t.includes(titre.toLowerCase())
    for (let i = 0; i + 4 <= mots.length; i++) {
      if (t.includes(mots.slice(i, i + 4).join(' '))) return true
    }
    return false
  })
}

export interface PersonaCheck {
  sentences: number
  tutoiement: boolean
  vouvoiement: boolean
  fillers: string[]
  enumeratesOffers: boolean
  /** Score 0-1 (heuristique), 1 = très naturel/concis. */
  score: number
  flags: string[]
}

export function personaCheck(
  reply: string,
  opts: { offerTitles?: string[]; maxSentences?: number; expectTutoiement?: boolean } = {},
): PersonaCheck {
  const maxSentences = opts.maxSentences ?? 3
  const sentences = countSentences(reply)
  const tutoiement = usesTutoiement(reply)
  const vouvoiement = usesVouvoiement(reply)
  const fillers = roboticFillers(reply)
  const enumerates = enumeratesOffers(reply, opts.offerTitles ?? [])

  const flags: string[] = []
  let penalty = 0
  if (sentences > maxSentences) {
    flags.push(`trop long (${sentences} phrases > ${maxSentences})`)
    penalty += Math.min(0.4, 0.12 * (sentences - maxSentences))
  }
  if (opts.expectTutoiement !== false && vouvoiement && !tutoiement) {
    flags.push('vouvoie au lieu de tutoyer')
    penalty += 0.3
  }
  if (fillers.length) {
    flags.push(`formules creuses: ${fillers.join(', ')}`)
    penalty += Math.min(0.3, 0.15 * fillers.length)
  }
  if (enumerates) {
    flags.push('énumère les offres en prose (doit rester dans les cards)')
    penalty += 0.35
  }
  return {
    sentences,
    tutoiement,
    vouvoiement,
    fillers,
    enumeratesOffers: enumerates,
    score: Math.max(0, 1 - penalty),
    flags,
  }
}

// ── Cards : détection de doublons ─────────────────────────────────────────────

export interface CardDupeCheck {
  duplicated: boolean
  /** ids d'opportunités apparaissant plus d'une fois. */
  duplicateIds: string[]
  totalOppItems: number
  uniqueOppItems: number
}

export function checkDuplicateCards(blocks: YayeBlock[]): CardDupeCheck {
  const counts = new Map<string, number>()
  for (const b of blocks) {
    if (b.kind === 'opportunites') {
      for (const it of b.items) counts.set(it.id, (counts.get(it.id) ?? 0) + 1)
    }
  }
  const duplicateIds = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id)
  const total = [...counts.values()].reduce((a, n) => a + n, 0)
  return {
    duplicated: duplicateIds.length > 0,
    duplicateIds,
    totalOppItems: total,
    uniqueOppItems: counts.size,
  }
}

// ── Diversité / anti-répétition entre réponses ────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(text: string): Set<string> {
  return new Set(normalize(text).split(' ').filter(Boolean))
}

/** Similarité de Jaccard entre deux textes (0 = disjoints, 1 = identiques). */
export function jaccard(a: string, b: string): number {
  const A = tokens(a)
  const B = tokens(b)
  if (A.size === 0 && B.size === 0) return 1
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}

/** Premier segment (salutation) d'une réponse, normalisé — pour repérer les ouvertures répétées. */
export function opening(text: string): string {
  const first = text.split(/(?<=[.!?…])\s+/)[0] ?? text
  return normalize(first).split(' ').slice(0, 4).join(' ')
}

export interface DiversityReport {
  n: number
  /** Nombre de réponses strictement identiques (après normalisation). */
  exactDuplicates: number
  /** Paires très similaires (Jaccard ≥ seuil). */
  nearDuplicatePairs: { i: number; j: number; similarity: number }[]
  /** Ouvertures (salutations) répétées à l'identique. */
  repeatedOpenings: { opening: string; count: number }[]
  maxSimilarity: number
  /** Score 0-1 : 1 = toutes distinctes. */
  score: number
}

/** Analyse un lot de réponses (ex. même prompt rejoué N fois) pour la répétition. */
export function diversityReport(replies: string[], threshold = 0.8): DiversityReport {
  const n = replies.length
  const norm = replies.map(normalize)
  const exactDuplicates = norm.length - new Set(norm).size

  const nearDuplicatePairs: { i: number; j: number; similarity: number }[] = []
  let maxSimilarity = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = jaccard(replies[i], replies[j])
      if (s > maxSimilarity) maxSimilarity = s
      if (s >= threshold) nearDuplicatePairs.push({ i, j, similarity: Number(s.toFixed(3)) })
    }
  }

  const openCounts = new Map<string, number>()
  for (const r of replies) openCounts.set(opening(r), (openCounts.get(opening(r)) ?? 0) + 1)
  const repeatedOpenings = [...openCounts.entries()]
    .filter(([, c]) => c > 1)
    .map(([opening, count]) => ({ opening, count }))

  const totalPairs = (n * (n - 1)) / 2
  const dupPenalty = totalPairs > 0 ? nearDuplicatePairs.length / totalPairs : 0
  const score = Math.max(0, 1 - dupPenalty - (exactDuplicates > 0 ? 0.3 : 0))

  return { n, exactDuplicates, nearDuplicatePairs, repeatedOpenings, maxSimilarity: Number(maxSimilarity.toFixed(3)), score: Number(score.toFixed(3)) }
}
