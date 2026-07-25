/**
 * GUIC-153 — S2 : le staff centre annule une réservation.
 * Oracle §14 : /centre-staff/reservations → « Annuler » → modal → POST cancel → réservation annulée (DB).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath, E2E_CENTRE_SLUG } from './_fixtures/roles'
import { E2E_UIDS } from './_fixtures/seed-e2e'

test.use({ storageState: storageStatePath('staff') })

let ressourceId = ''
let reservationId = ''

test.beforeAll(async () => {
  const prisma = getPrisma()
  const centre = await prisma.centre.findFirstOrThrow({ where: { slug: E2E_CENTRE_SLUG }, select: { id: true } })
  const res = await prisma.ressourceCentre.create({
    data: { centreId: centre.id, type: 'Salle', nom: 'Salle S2 E2E', capacite: 5, dureeMinCreneauMin: 60, requiresJustif: false, estActive: true },
  })
  ressourceId = res.id
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const resa = await prisma.reservation.create({
    data: {
      cjsUid: E2E_UIDS.jeune, centreId: centre.id, ressourceId: res.id,
      dateReservee: today, creneauDebut: '09:00', creneauFin: '11:00',
      nombrePersonnes: 1, motif: 'Réservation E2E S2 à annuler par le staff.', statut: 'Acceptee',
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

test.describe('S2 — annulation réservation (staff centre) @secondaire', () => {
  test('annuler une réservation du jour → n’est plus acceptée (DB)', async ({ page }) => {
    await page.goto('/centre-staff/reservations') // défaut = aujourd'hui
    await expect(page.getByTestId('staff-reservations-list')).toBeVisible()

    await page.getByTestId(`cancel-${reservationId}`).click()
    await page.getByTestId('cancel-confirm').click()

    // Preuve DB : la réservation n'est plus « Acceptee » (annulée par le staff).
    await expect
      .poll(async () => (await getPrisma().reservation.findUnique({ where: { id: reservationId }, select: { statut: true } }))?.statut, { timeout: 8000 })
      .not.toBe('Acceptee')
  })
})
