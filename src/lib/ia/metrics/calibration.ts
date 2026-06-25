// Calibration du juge Yaye (GUIC-435 — Phase 1, R2 & R3). Fonctions PURES.
//  - R2 : accord juge↔humain par dimension (Cohen's kappa sur scores binnés).
//  - R3 : dérive entre deux versions de rubrique (delta moyen par dimension sur un set figé).

export interface DimScores {
  fidelite: number
  pertinence: number
  utilite: number
  persona: number
  conformiteCdp: number
  langue: number
}

export const DIMENSIONS: (keyof DimScores)[] = [
  'fidelite',
  'pertinence',
  'utilite',
  'persona',
  'conformiteCdp',
  'langue',
]

/** Bin un score 0-1 en 3 classes : 0 = faible (<0.4), 1 = moyen (<0.7), 2 = bon. */
export function binScore(x: number): 0 | 1 | 2 {
  if (x < 0.4) return 0
  if (x < 0.7) return 1
  return 2
}

/** Cohen's kappa sur deux séries appariées de labels catégoriels. */
export function cohenKappa(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
  const cats = [...new Set([...a, ...b])]
  const idx = new Map(cats.map((c, i) => [c, i]))
  const k = cats.length
  const m = Array.from({ length: k }, () => new Array(k).fill(0))
  for (let i = 0; i < n; i++) m[idx.get(a[i])!][idx.get(b[i])!] += 1

  let po = 0
  for (let i = 0; i < k; i++) po += m[i][i]
  po /= n

  const rows = m.map((r) => r.reduce((x, y) => x + y, 0))
  const cols = cats.map((_, j) => m.reduce((s, r) => s + r[j], 0))
  let pe = 0
  for (let i = 0; i < k; i++) pe += (rows[i] / n) * (cols[i] / n)

  if (pe === 1) return po === 1 ? 1 : 0
  return (po - pe) / (1 - pe)
}

export interface AgreementResult {
  parDimension: Record<string, number>
  /** Moyenne des kappas sur toutes les dimensions. */
  global: number
  /** Dimensions critiques sous le seuil d'accord (par défaut 0.6). */
  faibles: string[]
}

/**
 * R2 — Accord juge↔humain : kappa par dimension sur des conversations doublement notées.
 * `human` et `judge` doivent être appariés (même ordre).
 */
export function agreementByDimension(
  human: DimScores[],
  judge: DimScores[],
  seuil = 0.6,
): AgreementResult {
  const parDimension: Record<string, number> = {}
  const faibles: string[] = []
  for (const dim of DIMENSIONS) {
    const kappa = cohenKappa(human.map((h) => binScore(h[dim])), judge.map((j) => binScore(j[dim])))
    parDimension[dim] = Math.round(kappa * 100) / 100
    if (kappa < seuil) faibles.push(dim)
  }
  const vals = Object.values(parDimension)
  return { parDimension, global: vals.reduce((a, b) => a + b, 0) / (vals.length || 1), faibles }
}

export interface DriftResult {
  parDimension: Record<string, number>
  /** Dimensions dont le score moyen a bougé de plus que `seuil` entre versions. */
  derives: string[]
}

/**
 * R3 — Dérive entre deux versions de rubrique : variation du score MOYEN par dimension
 * sur le même set figé de conversations. Sert à détecter qu'un changement de rubrique
 * a déplacé la note (régression ou correction).
 */
export function rubricDrift(versionA: DimScores[], versionB: DimScores[], seuil = 0.1): DriftResult {
  const moy = (xs: DimScores[], dim: keyof DimScores) =>
    xs.length ? xs.reduce((s, x) => s + x[dim], 0) / xs.length : 0
  const parDimension: Record<string, number> = {}
  const derives: string[] = []
  for (const dim of DIMENSIONS) {
    const delta = Math.round((moy(versionB, dim) - moy(versionA, dim)) * 100) / 100
    parDimension[dim] = delta
    if (Math.abs(delta) > seuil) derives.push(dim)
  }
  return { parDimension, derives }
}
