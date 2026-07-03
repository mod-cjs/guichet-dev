/**
 * GUIC-516 — Construction du CSV d'export des candidats (recruteur). Fonctions pures.
 */
export interface CsvCandidatRow {
  prenom: string
  nom: string
  email: string | null
  telephone: string | null
  offreTitre: string
  pipeline: string
  statut: string
  score: number | null
  soumiseA: string // ISO
}

const PIPE_LABEL: Record<string, string> = {
  Recue: 'Reçue', Preselection: 'Présélection', Entretien: 'Entretien', Decision: 'Décision',
}
const STATUT_LABEL: Record<string, string> = {
  En_attente: 'À examiner', Vue: 'Vue', Retenue: 'Retenue', Refusee: 'Refusée',
}

/** Échappe une cellule CSV (RFC 4180). */
export function csvCell(v: string): string {
  const s = v ?? ''
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const HEADER = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Offre', 'Étape', 'Statut', 'Score (%)', 'Candidature le']

/** Construit le CSV (BOM + CRLF) à partir des lignes candidats. */
export function buildCandidaturesCsv(rows: CsvCandidatRow[]): string {
  const lines = rows.map((r) =>
    [
      r.prenom,
      r.nom,
      r.email ?? '',
      r.telephone ?? '',
      r.offreTitre,
      PIPE_LABEL[r.pipeline] ?? r.pipeline,
      STATUT_LABEL[r.statut] ?? r.statut,
      r.score != null ? String(r.score) : '',
      r.soumiseA.slice(0, 10),
    ]
      .map(csvCell)
      .join(','),
  )
  return '﻿' + [HEADER.join(','), ...lines].join('\r\n')
}
