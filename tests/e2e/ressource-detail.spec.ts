/**
 * GUIC-153 — P5 : détail d'une ressource (public, anonyme).
 * Oracle §14 : /ressources (liste) → carte → /ressources/[id] (hero + CTA de consultation).
 */

import { test, expect } from '@playwright/test'

test.describe('P5 — détail ressource public @secondaire', () => {
  test('liste → détail ressource', async ({ page }) => {
    // GUIC-689 (Lot F2) — `/ressources` nu affiche désormais l'ACCUEIL médiathèque
    // (bandeau, catégories, étagères) ; la vue liste vit derrière `vue=liste`,
    // exactement là où mène le lien « Toutes les ressources → » de l'accueil.
    await page.goto('/ressources?vue=liste')
    await expect(page.getByTestId('results-count').first()).toBeVisible()

    // Ouvre la première ressource (données du seed dev).
    await page.getByRole('link', { name: /voir la ressource/i }).first().click()
    await page.waitForURL(/\/ressources\/[^/]+$/)

    await expect(page.getByTestId('ressource-detail-hero').first()).toBeVisible()
    await expect(page.getByTestId('ressource-consult-cta').first()).toBeVisible()
  })
})
