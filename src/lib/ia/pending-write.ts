// État d'écriture en attente de confirmation, persisté par session (multi-tour).
//
// Problème résolu : l'historique de conversation ne conserve que le TEXTE user/assistant — les
// résultats d'outils (donc le récap d'une écriture et ses `confirmArgs`) s'évaporent d'un tour à
// l'autre. Sur « Oui je confirme », le modèle n'avait plus de trace de ce qu'il allait réserver.
//
// Ici : quand un outil d'écriture (reserve_resource / submit_application / borrow_book) renvoie son
// récap (`confirm=false`), on mémorise `confirmArgs` en Redis, clé par `sessionId`. Au tour suivant,
// l'agent réinjecte cette action en attente dans le contexte → le modèle confirme avec les bons
// paramètres. Double emploi sécurité : le serveur MATÉRIALISE le consentement (l'écriture n'est
// possible qu'avec les params exacts du récap déjà présenté). Effacé après écriture ou expiration.

import { redis } from '@/lib/redis'

const TTL_SECONDS = 30 * 60 // 30 min : durée de vie d'un récap en attente de « oui »
const key = (sessionId: string) => `yaye:pending-write:${sessionId}`
const shownKey = (sessionId: string) => `yaye:shown-cards:${sessionId}`

export interface PendingWrite {
  /** Nom de l'outil d'écriture (reserve_resource, submit_application, borrow_book). */
  tool: string
  /** Paramètres EXACTS à réutiliser au moment du `confirm=true`. */
  args: Record<string, unknown>
}

/** Mémorise l'écriture en attente (fail-soft : une panne Redis ne bloque pas la conversation). */
export async function savePendingWrite(sessionId: string, pw: PendingWrite): Promise<void> {
  if (!sessionId) return
  try {
    await redis.set(key(sessionId), JSON.stringify(pw), 'EX', TTL_SECONDS)
  } catch {
    /* fail-soft */
  }
}

/** Charge l'écriture en attente pour cette session, ou null. */
export async function loadPendingWrite(sessionId: string): Promise<PendingWrite | null> {
  if (!sessionId) return null
  try {
    const v = await redis.get(key(sessionId))
    if (!v) return null
    const pw = JSON.parse(v) as PendingWrite
    return pw && typeof pw.tool === 'string' && pw.args && typeof pw.args === 'object' ? pw : null
  } catch {
    return null
  }
}

/** Efface l'écriture en attente (après écriture confirmée, ou au début d'une conversation). */
export async function clearPendingWrite(sessionId: string): Promise<void> {
  if (!sessionId) return
  try {
    await redis.del(key(sessionId))
  } catch {
    /* fail-soft */
  }
}

// ── Mémoire des CARDS MONTRÉES ────────────────────────────────────────────────
// Même problème d'évaporation que le récap : les résultats de recherche (ids des offres, salles,
// livres montrés à la personne) ne survivent pas d'un tour à l'autre (historique texte-seul). Sans
// eux, « postule à la première » au tour 2 n'a aucun id à passer. On mémorise donc les {id, label}
// des éléments affichés, réinjectés au tour suivant → l'anaphore (« la première ») se résout.

/** Un élément montré à la personne, référençable par une action ultérieure. */
export interface ShownRef {
  id: string
  label: string
}

const MAX_SHOWN = 12

/** Mémorise les éléments montrés (écrase : « la première » vise la DERNIÈRE liste affichée). */
export async function saveShownRefs(sessionId: string, refs: ShownRef[]): Promise<void> {
  if (!sessionId || refs.length === 0) return
  try {
    await redis.set(shownKey(sessionId), JSON.stringify(refs.slice(0, MAX_SHOWN)), 'EX', TTL_SECONDS)
  } catch {
    /* fail-soft */
  }
}

/** Charge les éléments montrés récemment, ou []. */
export async function loadShownRefs(sessionId: string): Promise<ShownRef[]> {
  if (!sessionId) return []
  try {
    const v = await redis.get(shownKey(sessionId))
    if (!v) return []
    const arr = JSON.parse(v) as ShownRef[]
    return Array.isArray(arr) ? arr.filter((r) => r && typeof r.id === 'string') : []
  } catch {
    return []
  }
}

/** Efface la mémoire des cards (début de conversation). */
export async function clearShownRefs(sessionId: string): Promise<void> {
  if (!sessionId) return
  try {
    await redis.del(shownKey(sessionId))
  } catch {
    /* fail-soft */
  }
}
