/**
 * GUIC-153 — C3 : le conseiller décide sur une réservation (accepter).
 * Oracle §14 : /conseiller/reservations → « Accepter » → deciderReservation → statut Acceptee (DB),
 * scopé au centre du conseiller. Chemin de décision.
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath, E2E_CENTRE_SLUG } from './_fixtures/roles'
import { E2E_UIDS } from './_fixtures/seed-e2e'

test.use({ storageState: storageStatePath('conseiller') })

let ressourceId = ''
let reservationId = ''

test.beforeAll(async () => {
  const prisma = getPrisma()
  const centre = await prisma.centre.findFirstOrThrow({ where: { slug: E2E_CENTRE_SLUG }, select: { id: true } })
  // Ressource « Salle » sur le centre du conseiller (statut initial EnAttente → file « À valider »).
  const res = await prisma.ressourceCentre.create({
    data: { centreId: centre.id, type: 'Salle', nom: 'Salle C3 E2E', capacite: 5, dureeMinCreneauMin: 60, requiresJustif: false, estActive: true },
  })
  ressourceId = res.id
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const resa = await prisma.reservation.create({
    data: {
      cjsUid: E2E_UIDS.jeune, centreId: centre.id, ressourceId: res.id,
      dateReservee: today, creneauDebut: '14:00', creneauFin: '16:00',
      nombrePersonnes: 1, motif: 'Réservation E2E C3 à valider par le conseiller.', statut: 'EnAttente',
    },
  })
  reservationId = resa.id
})

test.afterAll(async () => {
  const prisma = getPrisma()
  await prisma.reservation.deleteMany({ where: { id: reservationId } }).catch(() => {})
  await prisma.ressourceCentre.deleteMany({ where: { id: ressourceId } }).catch(() => {})
  await disconnectPrisma()
})

test.describe('C3 — décision réservation conseiller @secondaire', () => {
  test('accepter une réservation en attente → Acceptee', async ({ page }) => {
    await page.goto('/conseiller/reservations')
    // Onglet « À valider » (défaut). Cible la ligne de notre réservation puis « Accepter ».
    const ligne = page.locator('div, article, li').filter({ hasText: 'Salle C3 E2E' })
      .filter({ has: page.getByRole('button', { name: /^accepter$/i }) }).last()
    await ligne.getByRole('button', { name: /^accepter$/i }).click()

    // Modale de confirmation → « Confirmer l'acceptation ».
    await page.getByRole('button', { name: /confirmer l'acceptation/i }).click()

    await expect
      .poll(async () => (await getPrisma().reservation.findUnique({ where: { id: reservationId }, select: { statut: true } }))?.statut, { timeout: 8000 })
      .toBe('Acceptee')
  })
})
