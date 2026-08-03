/**
 * GUIC-692 (PR-B) — Helpers de mapping du détail candidature :
 * parseSnapshot (6 clés formulaireData, robuste aux valeurs manquantes/malformées),
 * auteurMessage (candidat vs recruteur), mapping entretien. TDD — RED d'abord.
 */
import { parseSnapshot, auteurMessage } from '@/lib/loaders/candidature-detail'

describe('GUIC-692 — parseSnapshot', () => {
  it('extrait les 6 clés attendues', () => {
    const s = parseSnapshot({
      email: 'a@b.sn', telephone: '+221770000010', niveauEtude: 'Master', situationEmploi: 'En emploi',
      competences: ['Python', 'SQL'], domainesInteret: ['Data'], _extra: 'ignoré',
    })
    expect(s.email).toBe('a@b.sn')
    expect(s.telephone).toBe('+221770000010')
    expect(s.niveauEtude).toBe('Master')
    expect(s.situationEmploi).toBe('En emploi')
    expect(s.competences).toEqual(['Python', 'SQL'])
    expect(s.domainesInteret).toEqual(['Data'])
  })

  it('robuste : null / non-objet → clés nulles et tableaux vides', () => {
    const a = parseSnapshot(null)
    expect(a.email).toBeNull()
    expect(a.competences).toEqual([])
    const b = parseSnapshot('pas un objet')
    expect(b.niveauEtude).toBeNull()
    expect(b.domainesInteret).toEqual([])
  })

  it('robuste : competences non-tableau → []', () => {
    const s = parseSnapshot({ competences: 'React', domainesInteret: null })
    expect(s.competences).toEqual([])
    expect(s.domainesInteret).toEqual([])
  })
})

describe('GUIC-692 — auteurMessage', () => {
  it('distingue candidat et recruteur selon le senderUid', () => {
    expect(auteurMessage('usr_candidat', 'usr_candidat', 'usr_recruteur')).toBe('candidat')
    expect(auteurMessage('usr_recruteur', 'usr_candidat', 'usr_recruteur')).toBe('recruteur')
    expect(auteurMessage('usr_autre', 'usr_candidat', 'usr_recruteur')).toBe('autre')
  })
})
