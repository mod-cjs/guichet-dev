/**
 * GUIC-153 — P1 : accueil public (anonyme).
 * Oracle §14 : hero + nav marketing + CTA « Se connecter » + section « Tout pour ton parcours ».
 */

import { test, expect } from '@playwright/test'

test.describe('P1 — accueil public @secondaire', () => {
  test('affiche le hero, la nav et les cartes', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /se connecter/i }).first()).toBeVisible()
    // Section « Tout pour ton parcours » + les 4 cartes (Opportunités/Agenda/Ressources/Centres).
    await expect(page.getByRole('heading', { name: /tout pour ton parcours/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^opportunités$/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^centres cjs$/i }).first()).toBeVisible()
  })
})
