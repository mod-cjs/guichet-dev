/**
 * Onboarding draft — client API (GUIC-181).
 *
 * Persisté côté serveur dans la table Prisma `OnboardingDraft` via les
 * routes `/api/onboarding/draft` (GET / PATCH / DELETE). Remplace l'ancien
 * `sessionStorage` (GUIC-179) pour permettre la reprise multi-device et la
 * résilience (cybercafé Sénégal, switch desktop/mobile).
 *
 * Schéma :
 * - `objectifs`     : tableau d'IDs ('emploi' | 'projet' | …) — écran 3
 * - `prenom/nom/dateNaissance/genre` — écran 4
 * - `region/commune` — écran 4
 *
 * Le téléphone est porté par le SSO (claim `phone_number`) ; il peut
 * néanmoins être stocké ici en transit (champ optionnel pour évolutions
 * futures).
 *
 * API publique stable :
 * - `readDraft()`              : `Promise<OnboardingDraft>` — lit le draft.
 * - `patchDraft(patch)`        : `Promise<OnboardingDraft>` — merge partiel.
 * - `clearDraft()`             : `Promise<void>` — supprime le draft.
 *
 * Un cache mémoire (par tab) évite les fetch redondants entre `readDraft()`
 * et le rendu initial des écrans. Le cache est invalidé à chaque
 * `patchDraft()` réussi.
 */

export type ObjectifId = 'emploi' | 'projet' | 'formation' | 'agriculture' | 'engagement'

export interface OnboardingDraft {
  objectifs:     ObjectifId[]
  prenom?:       string
  nom?:          string
  /** Format `YYYY-MM-DD` (cohérent avec `stepIdentiteSchema`). */
  dateNaissance?: string
  genre?:        'M' | 'F'
  region?:       string
  commune?:      string
  /** GUIC-660 — situation de handicap auto-déclarée (enum Handicap). */
  situationHandicap?: 'aucun' | 'moteur' | 'visuel' | 'auditif' | 'autre' | 'non_precise'
  /** GUIC-660 — zone d'habitation auto-déclarée. */
  zoneHabitation?: 'rural' | 'urbain'
}

interface RawDraft {
  objectifs:     string[] | null
  telephone:     string | null
  prenom:        string | null
  nom:           string | null
  dateNaissance: string | null
  genre:         string | null
  region:        string | null
  commune:       string | null
  situationHandicap: string | null
  zoneHabitation:    string | null
  updatedAt:     string
}

const ENDPOINT = '/api/onboarding/draft'

/** Cache en mémoire par onglet — invalidé à chaque mutation. */
let _cache: OnboardingDraft | null = null

function normalize(raw: RawDraft | null): OnboardingDraft {
  if (!raw) return { objectifs: [] }
  return {
    objectifs:     Array.isArray(raw.objectifs)
      ? (raw.objectifs.filter(isObjectifId))
      : [],
    prenom:        raw.prenom        ?? undefined,
    nom:           raw.nom           ?? undefined,
    dateNaissance: raw.dateNaissance ?? undefined,
    genre:         raw.genre === 'M' || raw.genre === 'F' ? raw.genre : undefined,
    region:        raw.region        ?? undefined,
    commune:       raw.commune       ?? undefined,
    situationHandicap: isHandicap(raw.situationHandicap) ? raw.situationHandicap : undefined,
    zoneHabitation:    raw.zoneHabitation === 'rural' || raw.zoneHabitation === 'urbain' ? raw.zoneHabitation : undefined,
  }
}

function isHandicap(v: unknown): v is NonNullable<OnboardingDraft['situationHandicap']> {
  return v === 'aucun' || v === 'moteur' || v === 'visuel'
    || v === 'auditif' || v === 'autre' || v === 'non_precise'
}

function isObjectifId(v: unknown): v is ObjectifId {
  return v === 'emploi' || v === 'projet' || v === 'formation'
    || v === 'agriculture' || v === 'engagement'
}

/** Lit le draft courant (cache en mémoire après le 1er fetch). */
export async function readDraft(): Promise<OnboardingDraft> {
  if (_cache) return _cache
  if (typeof window === 'undefined') return { objectifs: [] }
  try {
    const res = await fetch(ENDPOINT, { method: 'GET', credentials: 'same-origin' })
    if (!res.ok) {
      _cache = { objectifs: [] }
      return _cache
    }
    const body = (await res.json()) as { data: RawDraft | null }
    _cache = normalize(body.data)
    return _cache
  } catch {
    _cache = { objectifs: [] }
    return _cache
  }
}

/** Merge partiel et persiste côté serveur. Retourne le nouvel état. */
export async function patchDraft(patch: Partial<OnboardingDraft>): Promise<OnboardingDraft> {
  if (typeof window === 'undefined') return { objectifs: [] }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      // Échec serveur : invalider le cache pour forcer un refetch propre
      _cache = null
      return readDraft()
    }
    const body = (await res.json()) as { data: RawDraft | null }
    _cache = normalize(body.data)
    return _cache
  } catch {
    _cache = null
    return { objectifs: [] }
  }
}

/** Vide le draft (après finalisation onboarding). */
export async function clearDraft(): Promise<void> {
  _cache = null
  if (typeof window === 'undefined') return
  try {
    await fetch(ENDPOINT, { method: 'DELETE', credentials: 'same-origin' })
  } catch {
    /* silencieux */
  }
}

/** Pour les tests : reset du cache en mémoire. */
export function __resetDraftCache(): void {
  _cache = null
}
