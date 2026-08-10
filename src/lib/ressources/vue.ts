/**
 * Aiguillage de `/ressources` — GUIC-689 (Lot F2).
 *
 * Deux écrans derrière une seule URL : l'accueil médiathèque (bandeau de
 * recherche, catégories, étagères) quand aucun filtre n'est actif, la vue liste
 * dès qu'il y en a un.
 *
 * La règle vit ici, et non dans le composant de page, pour être vérifiable :
 * un test peut lui soumettre l'URL réelle d'un lien et savoir où elle mène.
 */
import type {
  DateBucket,
  LangueRessourceValue,
  NiveauRessourceValue,
  RessourceFiltres,
  TypeRessourceValue,
} from '@/lib/loaders/ressources'

/** Forme brute que Next passe à la page. */
export type SearchParamsRessources = Record<string, string | string[] | undefined>

const TYPES = ['PDF', 'Video', 'Lien', 'Guide', 'Outil'] as const
const NIVEAUX = ['Debutant', 'Intermediaire', 'Avance'] as const
const LANGUES = ['FR', 'Wolof'] as const
const DATES: readonly DateBucket[] = ['all', 'recent', 'year'] as const

/** Première valeur d'un paramètre (string | string[] | undefined). */
function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

/** Toutes les valeurs d'un paramètre (multi-select). */
function pickArray(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined
  if (Array.isArray(v)) return v.filter(Boolean)
  // Notre client encode les multi-valeurs sur des entrées répétées
  // (URLSearchParams.append). En SSR, si une seule entrée existe, Next renvoie
  // une string ; on la traite alors comme tableau d'une valeur.
  return v ? [v] : undefined
}

function asEnum<T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined {
  if (!v) return undefined
  return (allowed as readonly string[]).includes(v) ? (v as T) : undefined
}

export interface VueRessources {
  filtres: RessourceFiltres
  /** `true` → vue liste ; `false` → accueil médiathèque. */
  afficherListe: boolean
}

export function decrireVueRessources(sp: SearchParamsRessources): VueRessources {
  const filtres: RessourceFiltres = {
    q: pickString(sp.q)?.trim() || undefined,
    type: asEnum<TypeRessourceValue>(pickString(sp.type), TYPES),
    niveau: asEnum<NiveauRessourceValue>(pickString(sp.niveau), NIVEAUX),
    langue: asEnum<LangueRessourceValue>(pickString(sp.langue), LANGUES),
    categories: pickArray(sp.categorie),
    // GUIC-689 (Lot F2) — filtre thème exact, poussé par la grille « Explorer
    // par catégorie » de l'écran d'accueil médiathèque.
    theme: pickString(sp.theme)?.trim() || undefined,
    date: asEnum<DateBucket>(pickString(sp.date), DATES) ?? 'all',
    // GUIC-684 — filtre par programme sectoriel (multi).
    programmes: pickArray(sp.programme),
    page: Math.max(1, Number(pickString(sp.page)) || 1),
  }

  // `date=all` et `page=1` sont les valeurs par défaut : elles ne filtrent rien
  // et ne doivent donc pas faire basculer l'écran.
  const filtreActif =
    Boolean(filtres.q) ||
    Boolean(filtres.type) ||
    Boolean(filtres.niveau) ||
    Boolean(filtres.langue) ||
    Boolean(filtres.theme) ||
    Boolean(filtres.categories && filtres.categories.length) ||
    (filtres.date !== undefined && filtres.date !== 'all') ||
    Boolean(filtres.programmes && filtres.programmes.length) ||
    (filtres.page ?? 1) > 1

  return { filtres, afficherListe: filtreActif }
}
