/**
 * @jest-environment node
 *
 * GUIC-705 — parcours PROMOTION « curation → partenaire » de bout en bout contre
 * MariaDB réelle (prisma non mocké). Seule la frontière auth est simulée (admin).
 * Chaîne : dédup (suggère un doublon) → promouvoirEmployeur (crée org sans compte +
 * rattache l'offre) → le gate livrable 1 s'applique (suspendre l'org masque l'offre).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { suggererPartenaires } from '@/lib/partenaire-dedup'
import { promouvoirEmployeur, suggestionsPartenaire } from '@/app/admin/partenaires/actions'
import { getOpportuniteDetail } from '@/lib/opportunites-loader'

jest.setTimeout(30000)

const PREFIX = 'test-promo-705'
const RUN = Date.now()
const mockSession = getSession as jest.Mock

async function purge() {
  await prisma.opportunite.deleteMany({ where: { titre: { startsWith: PREFIX } } })
  await prisma.organisation.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}

beforeAll(async () => {
  await purge()
  mockSession.mockResolvedValue({ cjsUid: 'admin-promo', roles: ['admin'] })
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

describe('GUIC-705 — promotion curation→partenaire (DB réelle)', () => {
  it('dédup : suggère un partenaire existant proche du libellé (forme juridique ignorée)', async () => {
    const org = await prisma.organisation.create({
      data: { nom: `${PREFIX} GIZ Sénégal SARL`, cjsUid: null, statut: 'active' },
      select: { id: true },
    })
    // le préfixe de test fait partie du nom → on interroge avec ce même préfixe
    const sugg = await suggererPartenaires(`${PREFIX} GIZ Senegal`)
    expect(sugg.some((s) => s.id === org.id)).toBe(true)
  })

  it('promouvoirEmployeur(nom) : crée une org SANS compte et rattache l’offre curée', async () => {
    // offre curée : employeur en TEXTE seulement (organisationLibelle), pas d'org liée
    const opp = await prisma.opportunite.create({
      data: {
        slug: `${PREFIX}-curee-${RUN}`, titre: `${PREFIX} Chargé de projet`,
        description: 'Offre curée à rattacher.', type: 'Emploi', domaine: 'Autre',
        organisation: `${PREFIX} DER-FJ`, organisationLibelle: `${PREFIX} DER-FJ`,
        statut: 'publiee',
      },
      select: { id: true, organisationId: true },
    })
    expect(opp.organisationId).toBeNull()

    const { organisationId } = await promouvoirEmployeur({ opportuniteId: opp.id, nom: `${PREFIX} DER-FJ` })

    // l'offre est désormais liée à une organisation gérable, créée sans compte
    const after = await prisma.opportunite.findUnique({ where: { id: opp.id }, select: { organisationId: true } })
    expect(after?.organisationId).toBe(organisationId)
    const org = await prisma.organisation.findUnique({ where: { id: organisationId }, select: { cjsUid: true, statut: true } })
    expect(org?.cjsUid).toBeNull() // sans compte recruteur
    expect(org?.statut).toBe('active')

    // chaînage livrable 1 : suspendre l'org fraîchement créée masque l'offre côté jeune
    await prisma.organisation.update({ where: { id: organisationId }, data: { statut: 'suspendue' } })
    expect(await getOpportuniteDetail(`${PREFIX}-curee-${RUN}`)).toBeNull()
    await prisma.organisation.update({ where: { id: organisationId }, data: { statut: 'active' } })
    expect(await getOpportuniteDetail(`${PREFIX}-curee-${RUN}`)).not.toBeNull()
  })

  it('promouvoirEmployeur(organisationId) : rattache à un partenaire EXISTANT sans créer de doublon', async () => {
    const org = await prisma.organisation.create({
      data: { nom: `${PREFIX} Sonatel`, cjsUid: null, statut: 'active' },
      select: { id: true },
    })
    const opp = await prisma.opportunite.create({
      data: {
        slug: `${PREFIX}-curee2-${RUN}`, titre: `${PREFIX} Technicien`,
        description: 'Autre offre curée.', type: 'Emploi', domaine: 'Autre',
        organisation: `${PREFIX} Sonatel`, organisationLibelle: `${PREFIX} Sonatel`, statut: 'publiee',
      },
      select: { id: true },
    })
    const avant = await prisma.organisation.count({ where: { nom: { startsWith: PREFIX } } })
    const { organisationId } = await promouvoirEmployeur({ opportuniteId: opp.id, organisationId: org.id })
    expect(organisationId).toBe(org.id)
    const apres = await prisma.organisation.count({ where: { nom: { startsWith: PREFIX } } })
    expect(apres).toBe(avant) // aucun doublon créé
  })

  it('suggestionsPartenaire : non-admin → refus (frontière auth réelle)', async () => {
    mockSession.mockResolvedValueOnce({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(suggestionsPartenaire('X')).rejects.toThrow(/FORBIDDEN/)
  })
})
