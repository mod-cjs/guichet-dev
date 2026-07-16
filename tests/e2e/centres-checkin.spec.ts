/**
 * E2E Playwright — Flow check-in staff complet (DoD Lot 7 §6).
 * ====================================================================
 *
 * GUIC-394 — couvre le parcours staff :
 *   1. seed : centre + utilisateur + réservation du jour + JWT QR
 *   2. login staff via cookie direct (helper `loginStaffViaCookie`)
 *   3. /centre-staff accessible (cookie valide)
 *   4. /checkin/v1/<token> : la réservation s'affiche
 *   5. clic "Marquer présent" → success + réservation passe à `Passee` côté DB
 *
 * Pré-requis (skippé sinon) :
 *   - DB Prisma test active (`PLAYWRIGHT_E2E_DB=1`)
 *   - `STAFF_SESSION_SECRET` et `JWT_CJS_CARD_SECRET` partagés entre process
 *     Playwright et server Next.js (à injecter via `playwright.config.ts > webServer.env`)
 *   - `CONSEILLER_STAFF_EMAILS` inclut l'email du staff de test côté serveur
 *
 * Commande type :
 *   PLAYWRIGHT_E2E_DB=1 \
 *     STAFF_SESSION_SECRET=test-staff-secret \
 *     JWT_CJS_CARD_SECRET=$(openssl rand -hex 32) \
 *     CONSEILLER_STAFF_EMAILS=staff.e2e@cjs.sn \
 *     npx playwright test tests/e2e/centres-checkin.spec.ts
 */

import { test, expect } from '@playwright/test'
import { SignJWT } from 'jose'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import {
  seedCentreWithRessource,
  seedReservation,
  disconnectPrisma,
  type SeededCentre,
} from './_fixtures/centres'
import { loginStaffViaCookie } from './_fixtures/staff-auth'

const E2E_ACTIVE = process.env.PLAYWRIGHT_E2E_DB === '1'
const STAFF_EMAIL = 'staff.e2e@cjs.sn'

async function signQrToken(cjsUid: string): Promise<string> {
  const secret = process.env.JWT_CJS_CARD_SECRET
  if (!secret) {
    throw new Error('JWT_CJS_CARD_SECRET manquant côté Playwright')
  }
  // GUIC-616 — la clé DOIT être dérivée comme l'application : `getCJSCardSecret()` fait
  // `new TextEncoder().encode(raw)` (le secret tel quel), PAS un décodage hex. Le test
  // décodait en hex → clé différente → signature invalide → page « QR invalide ».
  const key = new TextEncoder().encode(secret)
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({ scope: 'checkin', nonce: `e2e-${now}` })
    .setProtectedHeader({ alg: 'HS256', kid: 'cjs-checkin-v1' })
    .setSubject(cjsUid)
    .setIssuedAt(now)
    .setExpirationTime(now + 15 * 60)
    .sign(key)
}

test.describe('flow check-in staff (E2E)', () => {
  test.skip(!E2E_ACTIVE, 'Activer avec PLAYWRIGHT_E2E_DB=1')

  let seed:          SeededCentre
  let reservationId: string
  let token:         string

  test.beforeAll(async () => {
    seed = await seedCentreWithRessource({ cjsUid: `staff-e2e-${Date.now().toString(36)}` })
    const r = await seedReservation({
      centreId:    seed.centreId,
      ressourceId: seed.ressourceId,
      cjsUid:      seed.cjsUid,
    })
    reservationId = r.reservationId
    token = await signQrToken(seed.cjsUid)
  })

  test.afterAll(async () => {
    if (seed) await seed.cleanup()
    await disconnectPrisma()
  })

  test('staff scanne QR → marque présent → résa passe à Passee', async ({ page, context }) => {
    // 2. Auth staff via cookie direct
    await loginStaffViaCookie(context, {
      email:    STAFF_EMAIL,
      centreId: seed.centreId,
    })

    // 3. /centre-staff doit charger sans rediriger vers /login
    await page.goto('/centre-staff')
    await expect(page).toHaveURL(/centre-staff(\?|$|\/)/)
    await expect(page).not.toHaveURL(/login/)

    // 4. Page de check-in avec token : la réservation s'affiche
    await page.goto(`/checkin/v1/${token}`)
    await expect(page.getByText(/Salle E2E/i).first()).toBeVisible({ timeout: 5_000 })

    // 5. Bouton "Marquer présent" sur la résa
    await page.getByRole('button', { name: /marquer présent/i }).first().click()

    // Message de succès
    await expect(page.getByText(/présent confirmé/i)).toBeVisible({ timeout: 5_000 })

    // Vérif DB : statut passe à Passee.
    // GUIC-616 — Prisma 7 exige un ADAPTATEUR (cf. src/lib/prisma.ts) : `new PrismaClient()`
    // nu lève « needs a valid PrismaClientOptions ».
    const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) })
    try {
      const resa = await prisma.reservation.findUnique({
        where:  { id: reservationId },
        select: { statut: true },
      })
      expect(resa?.statut).toBe('Passee')
    } finally {
      await prisma.$disconnect()
    }
  })
})
