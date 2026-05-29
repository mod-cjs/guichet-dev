/**
 * Onboarding draft client-side — `sessionStorage`.
 *
 * État partagé entre les écrans `/jeune/onboarding/*`. On utilise
 * `sessionStorage` (et non `localStorage`) pour éviter qu'un draft traîne
 * d'une session à l'autre sur un appareil partagé (cybercafé Sénégal).
 *
 * Schéma :
 * - `objectifs`     : tableau d'IDs ('emploi' | 'projet' | …) — écran 3
 * - `prenom/nom/dateNaissance/genre` — écran 4
 * - `region/commune` — écran 4
 *
 * Le téléphone n'est PAS stocké ici : c'est le SSO qui le porte (claim
 * `phone_number`). L'écran 2 redirige vers le flow SSO.
 *
 * Décision : pas de migration Prisma `OnboardingDraft` pour le MVP — on
 * persiste uniquement les champs `Utilisateur`+`ProfilJeune` via
 * `PUT /api/v1/onboarding` à l'écran 5. Si une étape est abandonnée, le
 * draft client expire avec la session navigateur.
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
}

const KEY = 'gj_onboarding_draft_v2'

/** Lit le draft courant. Retourne un objet vide si rien n'est stocké. */
export function readDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return { objectifs: [] }
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return { objectifs: [] }
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>
    return {
      objectifs: Array.isArray(parsed.objectifs) ? parsed.objectifs : [],
      prenom:        parsed.prenom,
      nom:           parsed.nom,
      dateNaissance: parsed.dateNaissance,
      genre:         parsed.genre,
      region:        parsed.region,
      commune:       parsed.commune,
    }
  } catch {
    return { objectifs: [] }
  }
}

/** Merge partiel et persiste. Retourne le nouvel état. */
export function patchDraft(patch: Partial<OnboardingDraft>): OnboardingDraft {
  const next = { ...readDraft(), ...patch }
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* quota / private mode — silencieux */
    }
  }
  return next
}

/** Vide le draft (après finalisation onboarding). */
export function clearDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    /* silencieux */
  }
}
