/**
 * GUIC-153 — Ad10 : statistiques admin (lecture — assert rendu, pas exactitude).
 * Oracle §14 : /admin/statistiques → « Statistiques & rapports » + cartes de stats + exports.
 * Data Hub — /admin/data-hub ne porte plus les statistiques mais le dictionnaire des flux.
 */

import { test, expect } from '@playwright/test'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('admin') })

test.afterAll(async () => { await disconnectPrisma() })

test.describe('Ad10 — statistiques admin @secondaire', () => {
  test('affiche les statistiques et les exports', async ({ page }) => {
    await page.goto('/admin/statistiques')

    await expect(page.getByRole('heading', { name: /statistiques.*rapports/i }).first()).toBeVisible()
    // Cartes de stats (assert rendu, pas l'exactitude des chiffres).
    await expect(page.getByRole('heading', { name: /inscriptions cumulées/i }).first()).toBeVisible()
    // Lien d'export.
    await expect(page.getByRole('link', { name: /utilisateurs/i }).first()).toBeVisible()
  })
})

test.describe('Ad10b — dictionnaire du Data Hub @secondaire', () => {
  test('décrit les flux exportés et leurs colonnes', async ({ page }) => {
    await page.goto('/admin/data-hub')

    await expect(page.getByRole('heading', { name: /dictionnaire du data hub/i })).toBeVisible()
    // Un flux du contrat, avec sa méthode de réplication.
    await expect(page.getByRole('heading', { name: 'utilisateurs' }).first()).toBeVisible()
    await expect(page.getByText('INCREMENTAL').first()).toBeVisible()
  })
})
