/**
 * GUIC-153 — R7 & C0 : chemins de refus / gating d'accès.
 * Oracle §14 : rôle d'espace SANS rattachement → écran « en attente » (pas de redirection login).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'

test.beforeAll(async () => {
  const prisma = getPrisma()
  // Défensif : ces identités ne DOIVENT avoir aucun rattachement.
  await prisma.organisation.deleteMany({ where: { cjsUid: 'e2e-recruteur-noorg' } }).catch(() => {})
  await prisma.agentCentre.deleteMany({ where: { cjsUid: 'e2e-conseiller-norat' } }).catch(() => {})
})

test.afterAll(async () => {
  await disconnectPrisma()
})

async function loginAs(page: import('@playwright/test').Page, role: string) {
  await page.context().addCookies([{ name: 'e2e_role', value: role, domain: 'localhost', path: '/' }])
  await page.goto('/auth/connexion')
  await page.getByRole('link', { name: /continuer avec mon compte cjs/i }).click()
}

test.describe('Gating d’accès — écrans en attente', () => {
  test('R7 — recruteur sans organisation → « en attente de liaison »', async ({ page }) => {
    await loginAs(page, 'recruteur-noorg')
    await page.waitForURL(/\/recruteur(\/|$)/)
    await expect(page.getByRole('heading', { name: /compte recruteur en attente de liaison/i })).toBeVisible()
    // ∅ aucune sidebar/nav recruteur ni contenu métier — seulement l'écran d'attente + retour accueil.
    await expect(page.getByRole('link', { name: /retour à l'accueil/i })).toBeVisible()
  })

  test('C0 — conseiller sans rattachement → « en attente de rattachement »', async ({ page }) => {
    await loginAs(page, 'conseiller-norat')
    await page.waitForURL(/\/conseiller(\/|$)/)
    await expect(page.getByRole('heading', { name: /compte conseiller en attente de rattachement/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /retour à l'accueil/i })).toBeVisible()
  })
})
