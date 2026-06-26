/**
 * @jest-environment node
 *
 * MOD-01 — aperçu admin d'un brouillon. `getOpportuniteDetailForAdmin` doit charger
 * une opportunité NON publiée (que `getOpportuniteDetail` masque), pour que l'admin
 * prévisualise avant d'approuver/rejeter. INTÉGRATION RÉELLE MariaDB.
 */
import { prisma } from '@/lib/prisma'
import { getOpportuniteDetail, getOpportuniteDetailForAdmin } from '@/lib/opportunites-loader'

jest.setTimeout(30000)
afterAll(async () => { await prisma.$disconnect() })

describe('MOD-01 — getOpportuniteDetailForAdmin', () => {
  it('charge un brouillon que la page publique (publiee) ne montre pas', async () => {
    const brouillon = await prisma.opportunite.findFirst({
      where: { statut: 'brouillon', deletedAt: null },
      select: { id: true, slug: true },
    })
    if (!brouillon) {
      console.warn('AUCUN brouillon en base — assertion MOD-01 non exécutée')
      return
    }

    // Côté admin : visible.
    const admin = await getOpportuniteDetailForAdmin(brouillon.id)
    expect(admin).not.toBeNull()
    expect(admin?.titre).toBeTruthy()

    // Côté public (filtre statut=publiee) : invisible.
    const pub = await getOpportuniteDetail(brouillon.slug)
    expect(pub).toBeNull()
  })

  it('retourne null pour un id inexistant', async () => {
    expect(await getOpportuniteDetailForAdmin('id-inexistant-xyz')).toBeNull()
  })
})
