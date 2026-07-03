/**
 * @jest-environment node
 *
 * GUIC-516 — Construction du CSV d'export candidats (fonctions pures).
 */
import { csvCell, buildCandidaturesCsv, type CsvCandidatRow } from '@/lib/recruteur/export-csv'

describe('GUIC-516 — csvCell', () => {
  it('échappe les cellules contenant , " ; ou retour ligne', () => {
    expect(csvCell('simple')).toBe('simple')
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""')
    expect(csvCell('a;b')).toBe('"a;b"')
  })
})

describe('GUIC-516 — buildCandidaturesCsv', () => {
  const row: CsvCandidatRow = {
    prenom: 'Awa', nom: 'Diop', email: 'awa@x.sn', telephone: '+221770000000',
    offreTitre: 'Stage Data', pipeline: 'Entretien', statut: 'Vue', score: 82, soumiseA: '2026-05-12T09:00:00.000Z',
  }

  it('en-tête + BOM + CRLF + libellés traduits', () => {
    const csv = buildCandidaturesCsv([row])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Prénom,Nom,Email')
    const l = csv.split('\r\n')
    expect(l).toHaveLength(2)
    expect(l[1]).toContain('Awa,Diop,awa@x.sn,+221770000000,Stage Data,Entretien,Vue,82,2026-05-12')
  })

  it('champs manquants (email/téléphone/score null) → cellules vides', () => {
    const csv = buildCandidaturesCsv([{ ...row, email: null, telephone: null, score: null }])
    expect(csv.split('\r\n')[1]).toBe('Awa,Diop,,,Stage Data,Entretien,Vue,,2026-05-12')
  })

  it('liste vide → en-tête seul', () => {
    expect(buildCandidaturesCsv([]).split('\r\n')).toHaveLength(1)
  })
})
