/**
 * GUIC-153 — @smoke P2 : recherche opportunité publique (anonyme).
 * Oracle §13 : liste → recherche (filtre) → détail, sans authentification.
 */

import { test, expect } from '@playwright/test'
import { seedOpportunite, combineCleanups } from './_fixtures/seed-e2e'
import { disconnectPrisma } from './_fixtures/prisma'

let cleanup: (() => Promise<void>) | undefined
let stageSlug = ''
const DEV_TITRE = 'Developpeur web junior E2E P2'
const AGRI_TITRE = 'Technicien agricole E2E P2'

test.beforeAll(async () => {
  const a = await seedOpportunite({ slug: 'e2e-p2-dev-stage', titre: DEV_TITRE, type: 'Stage', domaine: 'Numerique' })
  const b = await seedOpportunite({ slug: 'e2e-p2-agri-emploi', titre: AGRI_TITRE, type: 'Emploi', domaine: 'Agriculture' })
  const c = await seedOpportunite({ slug: 'e2e-p2-bourse', titre: 'Bourse etudes E2E P2', type: 'Bourse', domaine: 'Education' })
  stageSlug = a.slug
  cleanup = combineCleanups(a.cleanup, b.cleanup, c.cleanup)
})

test.afterAll(async () => {
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('P2 — recherche opportunité publique @smoke', () => {
  test('liste → recherche → détail (anonyme)', async ({ page }) => {
    await page.goto('/opportunites')

    // Écran 1 : les opportunités publiées seedées sont visibles.
    // (double DOM mobile+web → `.first()` évite la strict-mode violation, cf. oracle §13.)
    await expect(page.getByText(DEV_TITRE).first()).toBeVisible()
    await expect(page.getByText(AGRI_TITRE).first()).toBeVisible()

    // Recherche (debounce 300ms) → attendre le refetch client puis vérifier le filtrage.
    const search = page.getByRole('searchbox', { name: /rechercher une opportunit/i })
    await search.fill('Developpeur') // terme unique (les titres partagent « E2E P2 »)
    await page.waitForResponse((r) => r.url().includes('/api/opportunites') && r.ok())
    await expect(page.getByText(DEV_TITRE).first()).toBeVisible()
    await expect(page.getByText(AGRI_TITRE)).toHaveCount(0)

    // Écran 2 : clic carte → détail (nav directe ou interception modale) → URL sur le slug.
    await page.getByRole('link', { name: new RegExp(DEV_TITRE, 'i') }).first().click()
    await page.waitForURL(new RegExp(`/opportunites/${stageSlug}`))
    await expect(page.getByText(DEV_TITRE).first()).toBeVisible()

    // Anonyme : CTA de connexion, PAS de bouton « Postuler maintenant » (∅).
    await expect(page.getByRole('link', { name: /se connecter pour postuler/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /postuler maintenant/i })).toHaveCount(0)
  })
})
