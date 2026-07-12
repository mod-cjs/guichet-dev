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
  type: string // TypeOpportunite (libellé enum)
  organisation: string | null
  region: string | null
  deadline: string | null // ISO 8601
  /** Contexte affiché SUR la card (ex. raison de reco « plébiscitée par… ») — jamais en prose. */
  note?: string | null
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

/** Un bloc de réponse — rendu différemment selon son `kind`. */
export type YayeBlock =
  | { kind: 'text'; text: string }
  | { kind: 'opportunites'; items: YayeOppItem[] }
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
