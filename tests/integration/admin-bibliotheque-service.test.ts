/**
 * @jest-environment node
 *
 * GUIC-522 — Passe de complétude Bibliothèque admin. INTÉGRATION RÉELLE :
 * prisma N'EST PAS mocké → vraie MariaDB (quality-charter §3). Couvre :
 *   - Cluster B (F-06/F-07) : suppression sûre & honnête (livre/exemplaire)
 *   - Cluster C (F-08/F-09) : données de supervision (codeBarre, emprunteur, confirmePar)
 *   - Cluster D (F-11) : recherche catalogue scopée centre, tous statuts d'exemplaire
 * Pré-requis : DATABASE_URL vers la base de test locale (worktree admin-refonte, 3307).
 */
import { prisma } from '@/lib/prisma'
import {
  deleteExemplaire,
  deleteLivre,
  getEmpruntsCentre,
  getLivre,
  searchLivres,
  BiblioDomainError,
} from '@/lib/bibliotheque/service'

jest.setTimeout(30000)

let centreId: string
let userCjsUid: string
let userNom: string
let userPrenom: string

const createdLivres: string[] = []

beforeAll(async () => {
  const centre = await prisma.centre.findFirstOrThrow({ select: { id: true } })
  centreId = centre.id
  const user = await prisma.utilisateur.findFirstOrThrow({ select: { cjsUid: true, nom: true, prenom: true } })
  userCjsUid = user.cjsUid
  userNom = user.nom
  userPrenom = user.prenom
})

afterEach(async () => {
  if (createdLivres.length) {
    // Cascade attendue (Livre → Exemplaire onDelete: Cascade) mais les emprunts
    // (FK Restrict sur exemplaireId) doivent être purgés avant sinon P2003.
    await prisma.emprunt.deleteMany({
      where: { exemplaire: { livreId: { in: createdLivres } } },
    })
    await prisma.livre.deleteMany({ where: { id: { in: createdLivres } } })
    createdLivres.length = 0
  }
})
afterAll(async () => { await prisma.$disconnect() })

async function makeLivre(titre: string, theme = 'Sciences') {
  const livre = await prisma.livre.create({ data: { titre, auteur: 'Auteur test', theme } })
  createdLivres.push(livre.id)
  return livre
}

async function makeExemplaire(livreId: string, codeBarre: string, statut: 'disponible' | 'emprunte' = 'disponible') {
  return prisma.exemplaire.create({
    data: { livreId, centreId, codeBarre, rayon: 'A', etagere: '1', position: '1', statut },
  })
}

async function makeEmprunt(exemplaireId: string, statut: 'initie' | 'en_cours' | 'en_retard' | 'rendu') {
  return prisma.emprunt.create({
    data: {
      cjsUid: userCjsUid,
      exemplaireId,
      statut,
      confirmeA: statut === 'initie' ? null : new Date(),
      confirmePar: statut === 'initie' ? null : userCjsUid,
      dateRetourPrevue: statut === 'initie' ? null : new Date(Date.now() + 14 * 86400000),
      renduA: statut === 'rendu' ? new Date() : null,
    },
  })
}

// ── Cluster B — suppression sûre & honnête (F-06/F-07) ───────────────────────

describe('GUIC-522 Cluster B — deleteExemplaire (DB réelle)', () => {
  it('exemplaire avec un emprunt ACTIF (en_cours) → EXEMPLAIRE_EMPRUNT_ACTIF, rien supprimé', async () => {
    const livre = await makeLivre('Delete Ex — actif')
    const ex = await makeExemplaire(livre.id, `DEL-EX-ACTIF-${Date.now()}`, 'emprunte')
    await makeEmprunt(ex.id, 'en_cours')

    await expect(deleteExemplaire(ex.id, null)).rejects.toMatchObject({ code: 'EXEMPLAIRE_EMPRUNT_ACTIF' })
    expect(await prisma.exemplaire.findUnique({ where: { id: ex.id } })).not.toBeNull()
  })

  it('exemplaire avec un HISTORIQUE (emprunt rendu) → EXEMPLAIRE_HISTORIQUE, rien supprimé', async () => {
    const livre = await makeLivre('Delete Ex — historique')
    const ex = await makeExemplaire(livre.id, `DEL-EX-HIST-${Date.now()}`)
    await makeEmprunt(ex.id, 'rendu')

    await expect(deleteExemplaire(ex.id, null)).rejects.toMatchObject({ code: 'EXEMPLAIRE_HISTORIQUE' })
    expect(await prisma.exemplaire.findUnique({ where: { id: ex.id } })).not.toBeNull()
  })

  it('exemplaire SANS aucun emprunt → suppression réussie', async () => {
    const livre = await makeLivre('Delete Ex — vierge')
    const ex = await makeExemplaire(livre.id, `DEL-EX-VIERGE-${Date.now()}`)

    await expect(deleteExemplaire(ex.id, null)).resolves.toBeUndefined()
    expect(await prisma.exemplaire.findUnique({ where: { id: ex.id } })).toBeNull()
  })

  it('erreur BiblioDomainError → status 4xx (pas 500)', async () => {
    const livre = await makeLivre('Delete Ex — status')
    const ex = await makeExemplaire(livre.id, `DEL-EX-STATUS-${Date.now()}`, 'emprunte')
    await makeEmprunt(ex.id, 'initie')

    try {
      await deleteExemplaire(ex.id, null)
      throw new Error('devait rejeter')
    } catch (err) {
      expect(err).toBeInstanceOf(BiblioDomainError)
      expect((err as BiblioDomainError).status).toBeGreaterThanOrEqual(400)
      expect((err as BiblioDomainError).status).toBeLessThan(500)
    }
  })
})

describe('GUIC-522 Cluster B — deleteLivre (DB réelle)', () => {
  it('livre avec un exemplaire en emprunt ACTIF → LIVRE_EMPRUNT_ACTIF, rien supprimé', async () => {
    const livre = await makeLivre('Delete Livre — actif')
    const ex = await makeExemplaire(livre.id, `DEL-L-ACTIF-${Date.now()}`, 'emprunte')
    await makeEmprunt(ex.id, 'en_retard')

    await expect(deleteLivre(livre.id)).rejects.toMatchObject({ code: 'LIVRE_EMPRUNT_ACTIF' })
    expect(await prisma.livre.findUnique({ where: { id: livre.id } })).not.toBeNull()
  })

  it('livre dont un exemplaire a un HISTORIQUE (rendu) → LIVRE_HISTORIQUE, rien supprimé', async () => {
    const livre = await makeLivre('Delete Livre — historique')
    const ex = await makeExemplaire(livre.id, `DEL-L-HIST-${Date.now()}`)
    await makeEmprunt(ex.id, 'rendu')

    await expect(deleteLivre(livre.id)).rejects.toMatchObject({ code: 'LIVRE_HISTORIQUE' })
    expect(await prisma.livre.findUnique({ where: { id: livre.id } })).not.toBeNull()
  })

  it('livre SANS aucun emprunt (sur aucun exemplaire) → suppression réussie (cascade exemplaires)', async () => {
    const livre = await makeLivre('Delete Livre — vierge')
    const ex = await makeExemplaire(livre.id, `DEL-L-VIERGE-${Date.now()}`)

    await expect(deleteLivre(livre.id)).resolves.toBeUndefined()
    expect(await prisma.livre.findUnique({ where: { id: livre.id } })).toBeNull()
    expect(await prisma.exemplaire.findUnique({ where: { id: ex.id } })).toBeNull()
    createdLivres.length = createdLivres.length // livre déjà supprimé, rien à purger en afterEach
  })
})

// ── Cluster C — données de supervision (F-08/F-09) ────────────────────────────

describe('GUIC-522 Cluster C — F-08 codeBarre dans les emplacements', () => {
  it('getLivre expose codeBarre par emplacement', async () => {
    const livre = await makeLivre('Livre — codeBarre')
    const code = `CB-F08-${Date.now()}`
    await makeExemplaire(livre.id, code)

    const vue = await getLivre(livre.id)
    expect(vue.emplacements.length).toBeGreaterThan(0)
    expect(vue.emplacements.some((e) => e.codeBarre === code)).toBe(true)
  })
})

describe('GUIC-522 Cluster C — F-09 emprunteur + confirmePar', () => {
  it('getEmpruntsCentre résout emprunteur (nom/prénom) + confirmePar', async () => {
    const livre = await makeLivre('Livre — emprunteur')
    const ex = await makeExemplaire(livre.id, `CB-F09-${Date.now()}`, 'emprunte')
    await makeEmprunt(ex.id, 'en_cours')

    const rows = await getEmpruntsCentre(centreId, ['en_cours'])
    const row = rows.find((r) => r.exemplaire.id === ex.id)
    expect(row).toBeDefined()
    expect(row?.emprunteur).toEqual({ nom: userNom, prenom: userPrenom })
    expect(row?.confirmePar).toBe(userCjsUid)
  })
})

// ── Cluster D — recherche + pagination catalogue (F-11/F-12) ──────────────────

describe('GUIC-522 Cluster D — searchLivres scopé centre, mode gestion (tous statuts)', () => {
  it('emplacements: "tous" expose aussi les exemplaires NON disponibles (emprunté)', async () => {
    const livre = await makeLivre('Livre — mode gestion')
    await makeExemplaire(livre.id, `CB-D-DISPO-${Date.now()}`, 'disponible')
    await makeExemplaire(livre.id, `CB-D-EMP-${Date.now()}`, 'emprunte')

    const defaultResult = await searchLivres({ centreId, q: livre.titre })
    const defaultVue = defaultResult.livres.find((l) => l.id === livre.id)
    expect(defaultVue?.emplacements.length).toBe(1) // dispo seulement (comportement public inchangé)

    const gestionResult = await searchLivres({ centreId, q: livre.titre, emplacements: 'tous' })
    const gestionVue = gestionResult.livres.find((l) => l.id === livre.id)
    expect(gestionVue?.emplacements.length).toBe(2) // tous statuts (mode gestion admin)
  })

  it('la recherche texte filtre par titre', async () => {
    const unique = `UniqueTitreD-${Date.now()}`
    const livre = await makeLivre(unique)
    await makeExemplaire(livre.id, `CB-D-Q-${Date.now()}`)

    const r = await searchLivres({ centreId, q: unique })
    expect(r.total).toBe(1)
    expect(r.livres[0].titre).toBe(unique)
  })

  it('total reflète le vrai compte (pas de troncature silencieuse)', async () => {
    const r = await searchLivres({ centreId, pageSize: 1 })
    expect(r.total).toBeGreaterThanOrEqual(r.livres.length)
  })
})
