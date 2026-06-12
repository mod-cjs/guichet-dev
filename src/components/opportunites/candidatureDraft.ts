/**
 * Brouillons de candidature — GUIC-382 V2.
 *
 * - **Source de vérité** : table Prisma `CandidatureDraft` (sync multi-device).
 *   API : `/api/candidatures/drafts/[opportuniteId]` (GET/PUT/DELETE).
 * - **Fallback** : localStorage si le réseau est KO ou si l'utilisateur n'est
 *   pas authentifié (cas rare — la modale n'ouvre que pour les jeunes connectés).
 *
 * À l'ouverture de la modale : on lit serveur d'abord, fallback localStorage.
 * En cours de saisie : auto-save debounce 2 s côté serveur ET localStorage.
 * À la soumission OK : DELETE serveur + clear localStorage.
 *
 * Helpers sûrs SSR (toutes les fonctions retournent un no-op si `window`
 * n'existe pas).
 */

const PREFIX = 'gj:candidature-draft'
const VERSION = 1
const MAX_AGE_DAYS = 30 // les drafts > 30 jours sont ignorés (auto-nettoyage)

export interface CandidatureDraft {
  /** Version du schéma (pour migration future). */
  v: number
  cjsUid: string | null
  opportuniteId: string
  /** Lettre de motivation en cours. */
  lettre: string
  /** Consentement transmission profil coché ? */
  consent: boolean
  /** Le jeune avait sélectionné un fichier CV (non re-sérialisable côté localStorage). */
  hadCvFile: boolean
  /** Si le mode 'profile' (réutiliser CV profil) était actif. */
  cvMode: 'profile' | 'upload'
  /** Date de dernière mise à jour (ms epoch). */
  updatedAt: number
}

function key(cjsUid: string | null | undefined, opportuniteId: string): string {
  return `${PREFIX}:${cjsUid ?? 'self'}:${opportuniteId}`
}

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Sauvegarde un brouillon. No-op si pas de window ou storage indisponible.
 * Retourne `true` si l'écriture a réussi.
 */
export function saveCandidatureDraft(
  draft: Omit<CandidatureDraft, 'v' | 'updatedAt'>,
): boolean {
  const storage = safeStorage()
  if (!storage) return false
  // Ne pas sauvegarder de draft vide (juste de l'écriture inutile).
  if (!draft.lettre.trim() && !draft.consent && !draft.hadCvFile) {
    clearCandidatureDraft(draft.cjsUid, draft.opportuniteId)
    return false
  }
  try {
    const payload: CandidatureDraft = { ...draft, v: VERSION, updatedAt: Date.now() }
    storage.setItem(key(draft.cjsUid, draft.opportuniteId), JSON.stringify(payload))
    return true
  } catch {
    // Quota dépassé, mode privé Safari, etc. — on n'empêche pas la saisie.
    return false
  }
}

/**
 * Charge un brouillon. Retourne `null` si absent, expiré, ou corrompu.
 */
export function loadCandidatureDraft(
  cjsUid: string | null,
  opportuniteId: string,
): CandidatureDraft | null {
  const storage = safeStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(key(cjsUid, opportuniteId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CandidatureDraft
    if (parsed.v !== VERSION) return null
    const ageDays = (Date.now() - parsed.updatedAt) / (1000 * 60 * 60 * 24)
    if (ageDays > MAX_AGE_DAYS) {
      storage.removeItem(key(cjsUid, opportuniteId))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Supprime un brouillon (à appeler après soumission réussie). */
export function clearCandidatureDraft(cjsUid: string | null, opportuniteId: string): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.removeItem(key(cjsUid, opportuniteId))
  } catch {
    /* no-op */
  }
}

/**
 * Format relatif de la date de mise à jour (ex : « il y a 2 minutes »).
 * Volontairement simple — pas de dépendance i18n.
 */
export function formatDraftAge(updatedAt: number): string {
  const diffMs = Date.now() - updatedAt
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}
