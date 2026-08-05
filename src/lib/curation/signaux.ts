/**
 * GUIC-704 — signaux dérivés d'un item de curation (pur, testé, 0 fabrication).
 * ✓ = champ réellement extrait présent · ⚠ = point de vigilance (titre / doublon).
 */
export interface SignalCuration {
  ok: boolean
  label: string
}

export interface ItemSignalable {
  titre: string | null
  /** `payloadExtrait` de l'item (champs extraits par la veille). */
  payload: Record<string, unknown> | null
  statut: string
  doublonDeId: string | null
  sourceUrl?: string
}

function texte(p: Record<string, unknown>, cle: string): string | null {
  const v = p[cle]
  return typeof v === 'string' && v.trim() ? v : null
}

export function signauxCuration(item: ItemSignalable): SignalCuration[] {
  const p = item.payload ?? {}
  const s: SignalCuration[] = []

  if (texte(p, 'typeId')) s.push({ ok: true, label: 'Type identifié' })
  const region = texte(p, 'region')
  if (region) s.push({ ok: true, label: `Région : ${region}` })
  if (texte(p, 'organisation')) s.push({ ok: true, label: 'Organisation' })
  if (item.sourceUrl && /gouv\.sn/i.test(item.sourceUrl)) s.push({ ok: true, label: 'Source officielle' })

  if (!item.titre || !item.titre.trim()) s.push({ ok: false, label: 'Titre manquant' })
  if (item.statut === 'doublon' || item.doublonDeId) s.push({ ok: false, label: 'Doublon détecté' })

  return s
}
