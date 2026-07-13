// Contrat de réponse "en blocs" de Yaye (partagé backend ↔ frontend).
// Le service agent renvoie une réponse NORMALISÉE (sans canal) ; le rendu
// (cards cliquables, boutons de soumission) est fait par le frontend / le
// formateur. Cf. .agent_context/specs/yaye/04-canaux-web-whatsapp.md (formateur)
// et 03-outils-function-calling.md (objets normalisés resultats_livres, etc.).

/** Opportunité prête à afficher en card cliquable (→ /opportunites/[slug]). */
export interface YayeOppItem {
  id: string
  slug: string
  titre: string
  type: string // TypeOpportunite (libellé enum) — repli
  /** Slug de `OpportuniteType` (10 sous-catégories : financement, concours, mentorat, mobilite…). */
  typeSlug?: string | null
  /** Libellé fin du type (ex. « Financement », « Mentorat ») — affiché sur la card. */
  typeLabel?: string | null
  organisation: string | null
  region: string | null
  deadline: string | null // ISO 8601
  /** Contexte affiché SUR la card (ex. raison de reco « plébiscitée par… ») — jamais en prose. */
  note?: string | null
  /** CTA propre au type (« S'inscrire », « Postuler »…) ; override admin. Défaut par type sinon. */
  actionLabel?: string | null
}

/** Événement (agenda) prêt à afficher en card cliquable (→ /agenda/[id]). */
export interface YayeEvenementItem {
  id: string
  titre: string
  type: string // TypeEvenement (Atelier, Forum, Formation, Webinar, Conference, Cours)
  dateDebut: string // ISO 8601
  dateFin?: string | null
  lieu: string
  centre?: string | null
  estGratuit: boolean
}

/** Réponse rapide tappable : `label` affiché, `value` renvoyé comme message. */
export interface YayeQuickReply {
  label: string
  value: string
}

/** Accusé de réception d'escalade vers un conseiller humain (carte dédiée). */
export interface YayeEscaladeBlock {
  kind: 'escalade'
  /** Référence à citer (ex. YAYE-AB12CD). */
  reference: string
  title: string
  /** Attente HONNÊTE (aucun délai promis). */
  message: string
  /** Vrai si l'escalade provient d'un signal de danger. */
  danger?: boolean
  button?: { label: string; href: string }
}

/** Données minimales de la carte membre CJS (données de l'utilisateur LUI-MÊME — OK CDP). */
export interface YayeCarteCjsUser {
  prenom: string
  nom: string
  matricule: string
  membreDepuis: string
  photoUrl?: string
  centrePrincipal?: { nom: string; region: string }
}

/** Carte membre CJS affichée dans la conversation (recto/verso + QR). Design v4 `yaye-cjscard.jsx`. */
export interface YayeCarteCjsBlock {
  kind: 'carte_cjs'
  cjsUid: string
  user: YayeCarteCjsUser
  /** QR signé (Phase 4) ; si absent, la card retombe sur un QR démo dérivé de `cjsUid`. */
  qrToken?: string | null
}

/** Un bloc de réponse — rendu différemment selon son `kind`. */
export type YayeBlock =
  | { kind: 'text'; text: string }
  | { kind: 'opportunites'; items: YayeOppItem[] }
  | { kind: 'evenements'; items: YayeEvenementItem[] }
  | YayeCarteCjsBlock
  | { kind: 'quick_replies'; replies: YayeQuickReply[] }
  | {
      kind: 'action'
      title?: string
      subtitle?: string
      actions: { icon: string; label: string }[]
      buttons?: { label: string; href?: string; primary?: boolean }[]
    }
  | YayeEscaladeBlock

/**
 * Dédoublonne les cards avant l'envoi au frontend. Sur une boucle d'outils multi-rounds,
 * le modèle peut rappeler `search_opportunities`/`get_recommendations` → mêmes offres
 * poussées plusieurs fois (bug d'affichage : cards en double). On fusionne les items
 * `opportunites` par `id` (premier vu gagne, ordre préservé) et on retire les blocs
 * `opportunites` vides + les `quick_replies` strictement identiques déjà émis.
 */
/**
 * Quand des CARDS portent déjà le détail (offres, candidatures, action), on garde une intro
 * COURTE en texte (1 phrase) et on retire l'énumération en prose : les cards sont plus lisibles,
 * et ça neutralise les petits modèles qui recopient/inventent les titres en texte. No-op s'il
 * n'y a pas de card, ou si le texte tient déjà en une phrase.
 */
export function trimTextWhenCards(blocks: YayeBlock[]): YayeBlock[] {
  const hasCards = blocks.some(b => b.kind === 'opportunites' || b.kind === 'evenements' || b.kind === 'action' || b.kind === 'carte_cjs')
  if (!hasCards) return blocks
  return blocks.map(b => {
    if (b.kind !== 'text') return b
    const firstLine = b.text.split('\n').map(l => l.trim()).find(l => l.length > 0) ?? b.text.trim()
    const firstSentence = firstLine.split(/(?<=[.!?…])\s/)[0]?.trim() || firstLine
    return { kind: 'text', text: firstSentence }
  })
}

/**
 * Nombre MAXIMAL d'opportunités montrées par réponse (décision produit) : au-delà,
 * l'utilisateur est noyé — 3 offres bien ciblées valent mieux qu'une longue liste.
 * Plafond GLOBAL (toutes cards « opportunites » confondues : recherche, reco, graphe).
 */
export const MAX_OPP_ITEMS = 3

/**
 * Plafonne le nombre TOTAL d'opportunités affichées à `max` (défaut MAX_OPP_ITEMS), tous
 * blocs `opportunites` confondus, dans l'ordre. Les items en trop sont retirés ; un bloc
 * vidé disparaît. À appliquer APRÈS `dedupeBlocks` (pour garder les 3 meilleures, dédoublonnées).
 */
export function capOpportunites(blocks: YayeBlock[], max = MAX_OPP_ITEMS): YayeBlock[] {
  let remaining = max
  const out: YayeBlock[] = []
  for (const b of blocks) {
    if (b.kind === 'opportunites') {
      if (remaining <= 0) continue
      const items = b.items.slice(0, remaining)
      remaining -= items.length
      if (items.length > 0) out.push({ kind: 'opportunites', items })
    } else {
      out.push(b)
    }
  }
  return out
}

export function dedupeBlocks(blocks: YayeBlock[]): YayeBlock[] {
  const seenOpp = new Set<string>()
  const seenQuick = new Set<string>()
  const out: YayeBlock[] = []
  for (const b of blocks) {
    if (b.kind === 'opportunites') {
      const items = b.items.filter((it) => {
        if (seenOpp.has(it.id)) return false
        seenOpp.add(it.id)
        return true
      })
      if (items.length > 0) out.push({ kind: 'opportunites', items })
    } else if (b.kind === 'quick_replies') {
      const key = b.replies.map((r) => r.value).join('|')
      if (seenQuick.has(key)) continue
      seenQuick.add(key)
      out.push(b)
    } else {
      out.push(b)
    }
  }
  return out
}
