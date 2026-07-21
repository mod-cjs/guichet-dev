/**
 * GUIC-598 — US-3 : normalisation de dates FR/ISO vers `yyyy-mm-dd`, sans dépendance.
 */
const MOIS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
}

function iso(a: number, m: number, j: number): string | null {
  if (m < 1 || m > 12 || j < 1) return null
  // Validation du nombre de jours du mois (rejette 31/02, 31/04…), années bissextiles incluses.
  const bissextile = (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0
  const joursMois = [31, bissextile ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (j > joursMois[m - 1]) return null
  return `${a.toString().padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`
}

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function parseDateFr(texte: string | null | undefined): string | null {
  if (!texte) return null
  const t = texte.trim()

  // ISO yyyy-mm-dd (éventuellement avec heure).
  const mIso = t.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (mIso) return iso(Number(mIso[1]), Number(mIso[2]), Number(mIso[3]))

  // jj/mm/aaaa ou jj-mm-aaaa.
  const mNum = t.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (mNum) return iso(Number(mNum[3]), Number(mNum[2]), Number(mNum[1]))

  // « 31 juillet 2026 », « 1er septembre 2026 ».
  const mTxt = sansAccents(t.toLowerCase()).match(/(\d{1,2})\s*(?:er)?\s+([a-z]+)\s+(\d{4})/)
  if (mTxt) {
    const mois = MOIS[mTxt[2]]
    if (mois) return iso(Number(mTxt[3]), mois, Number(mTxt[1]))
  }
  return null
}
