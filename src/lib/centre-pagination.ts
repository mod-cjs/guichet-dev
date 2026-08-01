/**
 * Pagination serveur des listes de la fiche centre (GUIC-687). Logique pure, testable.
 * Chaque liste porte son propre préfixe de paramètre d'URL (ex. `rz` → `rzPage`, `rzQ`).
 */
export const PAGE_SIZE = 12

export interface PageInfo {
  page: number       // page courante (1-indexée, bornée)
  pageSize: number
  total: number      // total d'éléments (après filtre)
  totalPages: number
  skip: number       // offset Prisma
  from: number       // 1-indexé du 1er élément affiché (0 si vide)
  to: number         // 1-indexé du dernier élément affiché
}

/** Normalise un paramètre de page (chaîne d'URL) en entier ≥ 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

/** Normalise un terme de recherche (trim, borné). */
export function parseQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return (raw ?? '').trim().slice(0, 100)
}

/**
 * Calcule les bornes de pagination. `page` est ramenée dans [1, totalPages] pour éviter
 * une page vide au-delà de la fin (ex. après un filtre qui réduit le total).
 */
export function paginate(total: number, requestedPage: number, pageSize: number = PAGE_SIZE): PageInfo {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  const skip = (page - 1) * pageSize
  const from = total === 0 ? 0 : skip + 1
  const to = Math.min(skip + pageSize, total)
  return { page, pageSize, total, totalPages, skip, from, to }
}
