/**
 * GUIC-153 — Projet `setup` : logue chaque identité UNE fois et sauvegarde son `storageState`.
 *
 * Levier de temps n°1 : au lieu de rejouer le login SSO à chaque test, les specs réutilisent la
 * session via `test.use({ storageState })`. Le rôle est porté par le cookie `e2e_role` (lu par le
 * mock SSO). Le staff centre utilise son cookie JWT séparé (pas de SSO).
 *
 * Prérequis : globalSetup (seed) exécuté avant, mock SSO up (webServer), DATABASE_URL exporté.
 */

import { test as setup, expect } from '@playwright/test'
import {
  E2E_ROLES,
  storageStatePath,
  E2E_CENTRE_SLUG,
  E2E_STAFF_EMAIL,
  type E2ERole,
} from './_fixtures/roles'
import { loginStaffViaCookie } from './_fixtures/staff-auth'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'

/** URL d'atterrissage attendue par rôle (évite un match transitoire sur /jeune). */
const LANDING: Record<E2ERole, RegExp> = {
  jeune:        /\/jeune\//,
  'jeune-onb':  /\/jeune\/onboarding/,
  recruteur:    /\/recruteur(\/|$)/,
  admin:        /\/admin(\/|$)/,
  conseiller:   /\/conseiller(\/|$)/,
}

// Le cold-start `next dev` compile les routes à la volée au 1er hit → laisser de la marge.
setup.describe.configure({ timeout: 120_000 })

for (const role of E2E_ROLES) {
  setup(`authentifier ${role}`, async ({ browser }) => {
    const context = await browser.newContext()
    // Le cookie porte le rôle jusqu'au mock (cookie non lié au port → vu par l'app ET le mock).
    await context.addCookies([{ name: 'e2e_role', value: role, domain: 'localhost', path: '/' }])
    const page = await context.newPage()
    await page.goto('/auth/connexion')
    await page.getByRole('link', { name: /continuer avec mon compte cjs/i }).click()
    await page.waitForURL(LANDING[role], { timeout: 20_000 })
    await context.storageState({ path: storageStatePath(role) })
    await context.close()
  })
}

setup('authentifier staff centre', async ({ browser }) => {
  const prisma = getPrisma()
  const centre = await prisma.centre.findFirstOrThrow({
    where: { slug: E2E_CENTRE_SLUG },
    select: { id: true },
  })
  const context = await browser.newContext()
  await loginStaffViaCookie(context, { email: E2E_STAFF_EMAIL, centreId: centre.id })
  // Vérifie que la session staff est acceptée (pas de redirection vers /login).
  const page = await context.newPage()
  await page.goto('/centre-staff')
  await expect(page).not.toHaveURL(/\/centre-staff\/login/)
  await context.storageState({ path: storageStatePath('staff') })
  await context.close()
  await disconnectPrisma()
})
