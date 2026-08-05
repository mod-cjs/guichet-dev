/**
 * GUIC-692 (PR-A) — Loader Candidatures admin : helpers purs de supervision.
 * Funnel par étape (pipeline), KPIs (dont score IA moyen), where (statut+étape+recherche),
 * tri score, mapping ligne (enRetard/score/étape/favori). TDD — RED d'abord.
 */
import {
  PAGE_SIZE,
  parseStatutCand,
  parseEtapeCand,
  parseSortCand,
  buildCandidatureWhere,
  orderByForSort,
  mapCandidatureRow,
  funnelFromCounts,
  kpisFromCounts,
  SEUIL_RELANCE_MS,
  type CandidatureRowInput,
} from '@/lib/loaders/admin-candidatures'

describe('GUIC-692 — loader Candidatures (helpers)', () => {
  it('PAGE_SIZE = 20 et seuil de relance = 14 jours', () => {
    expect(PAGE_SIZE).toBe(20)
    expect(SEUIL_RELANCE_MS).toBe(14 * 86_400_000)
  })

  it('parseStatutCand n’accepte que les valeurs de l’enum, sinon ""', () => {
    expect(parseStatutCand('Retenue')).toBe('Retenue')
    expect(parseStatutCand('En_attente')).toBe('En_attente')
    expect(parseStatutCand('n’importe quoi')).toBe('')
    expect(parseStatutCand(undefined)).toBe('')
  })

  it('parseEtapeCand n’accepte que les étapes du pipeline, sinon ""', () => {
    expect(parseEtapeCand('Preselection')).toBe('Preselection')
    expect(parseEtapeCand('Entretien')).toBe('Entretien')
    expect(parseEtapeCand('bidon')).toBe('')
  })

  it('parseSortCand : "score" ou défaut "recent"', () => {
    expect(parseSortCand('score')).toBe('score')
    expect(parseSortCand('recent')).toBe('recent')
    expect(parseSortCand(undefined)).toBe('recent')
    expect(parseSortCand('xxx')).toBe('recent')
  })

  it('buildCandidatureWhere combine recherche (candidat/offre/recruteur) + statut + étape', () => {
    const w = buildCandidatureWhere({ q: 'awa', statut: 'Retenue', etape: 'Entretien' })
    expect(w.statut).toBe('Retenue')
    expect(w.pipelineStage).toBe('Entretien')
    expect(JSON.stringify(w)).toMatch(/awa/)
    // recherche vide → pas de OR, filtres absents → pas de clés statut/pipeline
    const empty = buildCandidatureWhere({ q: '', statut: '', etape: '' })
    expect(empty.statut).toBeUndefined()
    expect(empty.pipelineStage).toBeUndefined()
    expect(empty.OR).toBeUndefined()
  })

  it('orderByForSort : score DESC (nulls en dernier) sinon soumiseA DESC', () => {
    expect(orderByForSort('score')).toEqual([{ scoreAdequation: { sort: 'desc', nulls: 'last' } }])
    expect(orderByForSort('recent')).toEqual([{ soumiseA: 'desc' }])
  })

  it('mapCandidatureRow expose score, étape, favori et enRetard (>14j en attente)', () => {
    const vieux = new Date(Date.now() - 20 * 86_400_000)
    const recent = new Date(Date.now() - 2 * 86_400_000)
    const base = {
      utilisateur: { cjsUid: 'u1', prenom: 'Awa', nom: 'Diop' },
      opportunite: { id: 'o1', titre: 'Dev', organisation: 'Sonatel', organisationLibelle: null },
      scoreAdequation: 88, pipelineStage: 'Entretien', favoriRecruteur: true,
    } satisfies Omit<CandidatureRowInput, 'id' | 'statut' | 'soumiseA'>
    const r1 = mapCandidatureRow({ id: 'c1', statut: 'En_attente', soumiseA: vieux, ...base })
    expect(r1.score).toBe(88)
    expect(r1.etape).toBe('Entretien')
    expect(r1.favori).toBe(true)
    expect(r1.enRetard).toBe(true) // En_attente + >14j

    const r2 = mapCandidatureRow({ id: 'c2', statut: 'Retenue', soumiseA: vieux, ...base, scoreAdequation: null })
    expect(r2.score).toBeNull()
    expect(r2.enRetard).toBe(false) // pas En_attente → jamais "à relancer"

    const r3 = mapCandidatureRow({ id: 'c3', statut: 'En_attente', soumiseA: recent, ...base })
    expect(r3.enRetard).toBe(false) // récent
  })

  it('funnelFromCounts : Reçue/Présélection/Entretien/Décision depuis groupBy pipeline', () => {
    const f = funnelFromCounts([
      { pipelineStage: 'Recue', _count: { id: 56 } },
      { pipelineStage: 'Preselection', _count: { id: 44 } },
      { pipelineStage: 'Entretien', _count: { id: 30 } },
      { pipelineStage: 'Decision', _count: { id: 20 } },
    ])
    expect(f.recue).toBe(56)
    expect(f.preselection).toBe(44)
    expect(f.entretien).toBe(30)
    expect(f.decision).toBe(20)
    // conversion = retenue/reçues ; ici retenue par défaut 0 → 0
    expect(f.conversionPct).toBe(0)
    expect(funnelFromCounts([{ pipelineStage: 'Recue', _count: { id: 100 } }], 14).conversionPct).toBe(14)
  })

  it('kpisFromCounts : enAttente/vues/retenues + score moyen (sur non-null) + insertions à part', () => {
    const k = kpisFromCounts(
      [
        { statut: 'En_attente', _count: { id: 56 } },
        { statut: 'Vue', _count: { id: 88 } },
        { statut: 'Retenue', _count: { id: 28 } },
        { statut: 'Refusee', _count: { id: 28 } },
      ],
      68.4, // moyenne score renvoyée par prisma.aggregate
      3640, // insertions réelles (modèle Insertion, distinct de Retenue)
    )
    expect(k.enAttente).toBe(56)
    expect(k.vues).toBe(88)
    expect(k.retenues).toBe(28)
    expect(k.scoreMoyen).toBe(68) // arrondi
    expect(k.insertions).toBe(3640)
  })
})
