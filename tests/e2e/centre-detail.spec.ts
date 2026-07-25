/**
 * GUIC-153 — P4 : détail d'un centre (public).
 * Oracle §14 : /centres/[slug] → hero (nom), horaires, ressources réservables. Lecture, sans auth.
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { E2E_CENTRE_SLUG } from './_fixtures/roles'

let nom = ''

test.beforeAll(async () => {
  const c = await getPrisma().centre.findFirstOrThrow({ where: { slug: E2E_CENTRE_SLUG }, select: { nom: true } })
  nom = c.nom
})

test.afterAll(async () => { await disconnectPrisma() })

test.describe('P4 — détail centre public @secondaire', () => {
  test('affiche le centre, ses horaires et ses ressources', async ({ page }) => {
    await page.goto(`/centres/${E2E_CENTRE_SLUG}`)

    // Hero : le nom du centre en titre.
    await expect(page.getByRole('heading', { level: 1, name: nom }).first()).toBeVisible()
    // Retour vers la liste.
    await expect(page.getByRole('link', { name: /tous les centres/i }).first()).toBeVisible()
    // Horaires + ressource réservable seedées par global-setup.
    await expect(page.getByRole('heading', { name: /^horaires$/i }).first()).toBeVisible()
    await expect(page.getByText(/salle e2e/i).first()).toBeVisible()
    // Public anonyme : CTA de connexion pour la carte CJS (pas de contenu authentifié).
    await expect(page.getByRole('link', { name: /se connecter/i }).first()).toBeVisible()
  })
})
