/**
 * @jest-environment node
 *
 * GUIC-647 — Pipeline kanban recruteur : les refusées sortent des colonnes actives
 * (zone dédiée `refusees`) et le loader accepte des filtres avancés candidat.
 */
// GUIC-538 — mock Prisma partagé (auto-mock de toute méthode).
jest.mock('@/lib/prisma')

import { prisma } from '@/lib/prisma'
import { getRecruteurPipeline } from '@/lib/loaders/recruteur'

const p = prisma as unknown as {
  opportunite: { findMany: jest.Mock }
  candidature: { findMany: jest.Mock }
}

function row(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    pipelineStage: 'Recue',
    scoreAdequation: 80,
    favoriRecruteur: false,
    soumiseA: new Date('2026-07-01T10:00:00.000Z'),
    utilisateur: {
      prenom: 'Awa',
      nom: 'Diop',
      dateNaissance: new Date('2002-01-15'),
      commune: 'Dakar Plateau',
      profil: { niveauEtude: 'Licence', competences: ['Python', 'Excel'] },
    },
    opportunite: { titre: 'Stage Data' },
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  p.opportunite.findMany.mockResolvedValue([{ id: 'o1', titre: 'Stage Data', statut: 'publiee' }])
  p.candidature.findMany.mockResolvedValue([])
})

describe('GUIC-647 — refusées hors colonnes actives', () => {
  it('les colonnes excluent statut Refusee', async () => {
    await getRecruteurPipeline('rec-1', 'org-1')
    const whereActives = p.candidature.findMany.mock.calls[0][0].where
    expect(whereActives.statut).toEqual({ not: 'Refusee' })
    expect(whereActives.opportunite).toBeTruthy()
  })

  it('une seconde requête récupère les refusées (statut Refusee, même scope)', async () => {
    p.candidature.findMany
      .mockResolvedValueOnce([row('c1')])
      .mockResolvedValueOnce([row('r1', { pipelineStage: 'Decision' })])
    const res = await getRecruteurPipeline('rec-1', 'org-1')
    expect(p.candidature.findMany).toHaveBeenCalledTimes(2)
    const whereRefusees = p.candidature.findMany.mock.calls[1][0].where
    expect(whereRefusees.statut).toBe('Refusee')
    expect(whereRefusees.opportunite).toBeTruthy()
    expect(res.refusees).toHaveLength(1)
    expect(res.refusees[0].id).toBe('r1')
    // La refusée n'apparaît dans aucune colonne active.
    const ids = Object.values(res.colonnes).flat().map((c) => c.id)
    expect(ids).toEqual(['c1'])
  })

  it('le scope offre s’applique aussi aux refusées', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', 'o1')
    expect(p.candidature.findMany.mock.calls[0][0].where.opportuniteId).toBe('o1')
    expect(p.candidature.findMany.mock.calls[1][0].where.opportuniteId).toBe('o1')
  })
})

describe('GUIC-647 — filtres avancés', () => {
  it('region + genre → filtre utilisateur (enum validé)', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', undefined, { region: 'Dakar', genre: 'F' })
    const u = p.candidature.findMany.mock.calls[0][0].where.utilisateur
    expect(u.region).toBe('Dakar')
    expect(u.genre).toBe('F')
  })

  it('region hors enum → ignorée (pas de filtre)', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', undefined, { region: 'Atlantis' })
    const where = p.candidature.findMany.mock.calls[0][0].where
    expect(where.utilisateur).toBeUndefined()
  })

  it('commune → contains', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', undefined, { commune: 'Plateau' })
    const u = p.candidature.findMany.mock.calls[0][0].where.utilisateur
    expect(u.commune).toEqual({ contains: 'Plateau' })
  })

  it('ageMin/ageMax → bornes dateNaissance (lte pour min, gte pour max)', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', undefined, { ageMin: 20, ageMax: 25 })
    const dn = p.candidature.findMany.mock.calls[0][0].where.utilisateur.dateNaissance
    expect(dn.lte).toBeInstanceOf(Date)
    expect(dn.gte).toBeInstanceOf(Date)
    // Né avant (now - 20 ans) ET après (now - 26 ans) → gte < lte.
    expect(dn.gte.getTime()).toBeLessThan(dn.lte.getTime())
    const ansLte = (Date.now() - dn.lte.getTime()) / (365.25 * 24 * 3600 * 1000)
    expect(Math.round(ansLte)).toBe(20)
  })

  it('niveau + situation → profil contains', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', undefined, { niveau: 'Licence', situation: 'recherche' })
    const u = p.candidature.findMany.mock.calls[0][0].where.utilisateur
    expect(u.profil).toEqual({
      niveauEtude: { contains: 'Licence' },
      situationEmploi: { contains: 'recherche' },
    })
  })

  it('scoreMin → scoreAdequation gte', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', undefined, { scoreMin: 70 })
    expect(p.candidature.findMany.mock.calls[0][0].where.scoreAdequation).toEqual({ gte: 70 })
  })

  it('favoris → favoriRecruteur true', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', undefined, { favoris: true })
    expect(p.candidature.findMany.mock.calls[0][0].where.favoriRecruteur).toBe(true)
  })

  it('depuis (jours) → soumiseA gte', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', undefined, { depuisJours: 7 })
    const s = p.candidature.findMany.mock.calls[0][0].where.soumiseA
    expect(s.gte).toBeInstanceOf(Date)
    const jours = (Date.now() - s.gte.getTime()) / (24 * 3600 * 1000)
    expect(Math.round(jours)).toBe(7)
  })

  it('q → recherche prénom/nom conservée', async () => {
    await getRecruteurPipeline('rec-1', 'org-1', undefined, { q: 'awa' })
    const u = p.candidature.findMany.mock.calls[0][0].where.utilisateur
    expect(u.OR).toEqual(
      expect.arrayContaining([{ prenom: { contains: 'awa' } }, { nom: { contains: 'awa' } }]),
    )
  })

  it('competence → post-filtre applicatif insensible à la casse (colonne Json)', async () => {
    p.candidature.findMany
      .mockResolvedValueOnce([
        row('c1'), // Python + Excel
        row('c2', { utilisateur: { ...row('x').utilisateur, profil: { niveauEtude: null, competences: ['Marketing'] } } }),
      ])
      .mockResolvedValueOnce([])
    const res = await getRecruteurPipeline('rec-1', 'org-1', undefined, { competence: 'python' })
    const ids = Object.values(res.colonnes).flat().map((c) => c.id)
    expect(ids).toEqual(['c1'])
  })

  it('sans filtre → aucun critère candidat parasite', async () => {
    await getRecruteurPipeline('rec-1', 'org-1')
    const where = p.candidature.findMany.mock.calls[0][0].where
    expect(where.utilisateur).toBeUndefined()
    expect(where.scoreAdequation).toBeUndefined()
    expect(where.favoriRecruteur).toBeUndefined()
    expect(where.soumiseA).toBeUndefined()
  })
})
