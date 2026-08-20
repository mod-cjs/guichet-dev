// GUIC-259 — libellés lisibles des codes d'escalade. Le back stocke des codes machine
// (raison : sujet_sensible… cf. tools.ts ESCALADE_MOTIFS ; signal de danger :
// automutilation_suicide… cf. DANGER_SIGNALS). L'admin ne doit jamais voir le code brut :
// non-humanisé, et surtout les libellés de danger doivent être écrits avec soin (ce sont des
// situations graves). Module PUR. Un code inconnu retombe sur un humanisé générique.

/** Motifs d'escalade (tools.ts ESCALADE_MOTIFS) → libellés. */
export const RAISON_LABELS: Record<string, string> = {
  demande_complexe: 'Demande complexe',
  sujet_sensible: 'Sujet sensible',
  demande_explicite: 'Demande explicite d’un humain',
  echec_repete: 'Échec répété',
  autre: 'Autre',
}

/** Signaux de danger (tools.ts DANGER_SIGNALS) → libellés soignés. */
export const DANGER_LABELS: Record<string, string> = {
  violence: 'Violence',
  harcelement: 'Harcèlement',
  abus_sexuel: 'Abus sexuel',
  exploitation: 'Exploitation',
  automutilation_suicide: 'Automutilation / suicide',
  discrimination: 'Discrimination',
  autre_danger: 'Autre danger',
}

/** Humanise un code inconnu : `un_nouveau_motif` → `Un nouveau motif`. */
function humaniser(code: string): string {
  const s = code.replace(/_/g, ' ').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

/** Libellé lisible d'un motif d'escalade. null/vide → « — ». */
export function raisonLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return RAISON_LABELS[code] ?? humaniser(code)
}

/** Libellé lisible d'un signal de danger. null/vide → « — ». */
export function dangerLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return DANGER_LABELS[code] ?? humaniser(code)
}
