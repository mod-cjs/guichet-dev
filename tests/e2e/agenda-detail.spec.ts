/**
 * GUIC-153 — P3 : détail d'un événement (public, anonyme).
 * Oracle §14 : /agenda/[id] → hero, « Informations pratiques », CTA « Se connecter pour s'inscrire ».
 */

import { test, expect } from '@playwright/test'
import { seedEvenement } from './_fixtures/seed-e2e'
import { disconnectPrisma } from './_fixtures/prisma'

let cleanup: (() => Promise<void>) | undefined
let eventId = ''
const TITRE = 'Forum E2E P3 détail agenda'

test.beforeAll(async () => {
  const ev = await seedEvenement({ titre: TITRE, dansJours: 20, capaciteMax: 100 })
  eventId = ev.id; cleanup = ev.cleanup
})

test.afterAll(async () => { await cleanup?.(); await disconnectPrisma() })

test.describe('P3 — détail événement public @secondaire', () => {
  test('affiche l’événement et le CTA anonyme', async ({ page }) => {
    await page.goto(`/agenda/${eventId}`)

    await expect(page.getByRole('heading', { level: 1, name: TITRE }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /informations pratiques/i }).first()).toBeVisible()
    // Anonyme : CTA de connexion pour s'inscrire (∅ inscription directe).
    await expect(page.getByRole('button', { name: /se connecter pour s'inscrire/i }).first()).toBeVisible()
  })
})
