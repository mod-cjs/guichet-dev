// Classement HYBRIDE d'un corpus par pertinence (GUIC-683).
//
// Le problème : toute la plateforme cherche en `titre LIKE '%mot%'`. « poisson » ne trouve
// pas « aquaculture », « sites web » ne trouve pas « intégrateur front-end ». Le LIKE ne
// rate pas seulement des nuances — il rend zéro résultat là où le catalogue en contient.
//
// La règle de conception, héritée de `matchSkillsHybrid` : le LEXICAL reste un signal FORT
// (une correspondance de titre gagne toujours), le SÉMANTIQUE ne fait que RATTRAPER les
// reformulations. On n'échange jamais une correspondance exacte contre une proximité floue.
//
// ⚠️ LATENCE BORNÉE : sur le chemin de réponse, on ne vectorise QUE la requête de l'usager
// (un aller-retour, lui-même mis en cache). Les textes du corpus sont lus DEPUIS LE CACHE
// uniquement (`maxNew: 0`) — ils sont vectorisés hors ligne par le préchauffage nocturne.
// Un corpus non encore préchauffé ne coûte donc rien : il est simplement ignoré par la
// voie sémantique, et le lexical répond seul.

import { cosine, embedTexts, isEmbeddingEnabled, normalizeForEmbedding, SEMANTIC_THRESHOLD } from './embeddings'

/** Un élément classable : un identifiant et le texte qui le décrit. */
export interface RankableItem {
  id: string
  /** Texte représentatif (titre, éventuellement enrichi de l'organisation ou du thème). */
  text: string
}

export interface RankOptions {
  /** Similarité cosinus minimale pour qu'un élément soit retenu par la voie sémantique. */
  threshold?: number
  /** Nombre maximum d'éléments rendus (défaut : tous ceux au-dessus du seuil). */
  max?: number
}

/** Score d'un élément et voie qui l'a fait remonter (utile au diagnostic et aux tests). */
export interface RankedItem {
  id: string
  score: number
  via: 'lexical' | 'semantique'
}

/** Correspondance lexicale insensible à la casse et aux accents (l'équivalent du LIKE). */
function matchLexical(query: string, text: string): boolean {
  const q = normalizeForEmbedding(query)
  return q.length > 0 && normalizeForEmbedding(text).includes(q)
}

/**
 * Classe un corpus par pertinence vis-à-vis d'une requête en langage naturel.
 *
 * Les correspondances lexicales sortent EN TÊTE (score 1), suivies des correspondances
 * sémantiques au-dessus du seuil. Un élément trouvé par les deux voies n'apparaît qu'une
 * fois. Si les embeddings sont coupés ou indisponibles, le résultat est exactement celui
 * du filtre lexical d'origine.
 */
export async function rankByRelevance(
  query: string,
  items: RankableItem[],
  opts: RankOptions = {},
): Promise<RankedItem[]> {
  const q = query.trim()
  if (!q || items.length === 0) return []

  const threshold = opts.threshold ?? SEMANTIC_THRESHOLD
  const retenus = new Map<string, RankedItem>()

  // 1. Voie LEXICALE — prioritaire, et seule voie si les embeddings sont coupés.
  for (const item of items) {
    if (matchLexical(q, item.text)) retenus.set(item.id, { id: item.id, score: 1, via: 'lexical' })
  }

  // 2. Voie SÉMANTIQUE — rattrape les reformulations.
  if (isEmbeddingEnabled()) {
    // La requête est le SEUL texte qu'on accepte de vectoriser à chaud.
    const requete = (await embedTexts([q])).get(normalizeForEmbedding(q))
    if (requete) {
      // Corpus : lecture de cache STRICTE (aucune vectorisation à chaud).
      const corpus = await embedTexts(items.map(i => i.text), { maxNew: 0 })
      for (const item of items) {
        if (retenus.has(item.id)) continue // le lexical prime, on ne le déclasse pas
        const v = corpus.get(normalizeForEmbedding(item.text))
        if (!v) continue // pas encore préchauffé → ignoré, sans coût
        const score = cosine(requete, v)
        if (score >= threshold) retenus.set(item.id, { id: item.id, score, via: 'semantique' })
      }
    }
  }

  const classes = [...retenus.values()].sort((a, b) => b.score - a.score)
  return opts.max ? classes.slice(0, opts.max) : classes
}
