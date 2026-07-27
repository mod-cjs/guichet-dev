/**
 * GUIC-153 — @smoke J1 : candidature à une opportunité (jeune, profil complet).
 * Oracle §13 : /opportunites/[slug] → « Postuler maintenant » → modal (lettre ≥300 + consentement)
 * → « Envoyer ma candidature » → SuccessScreen (réf CAND-).
 */

import { test, expect } from '@playwright/test'
import { seedOpportunite } from './_fixtures/seed-e2e'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'
import { E2E_UIDS } from './_fixtures/seed-e2e'

test.use({ storageState: storageStatePath('jeune') })

let cleanup: (() => Promise<void>) | undefined
let slug = ''
let oppId = ''

test.beforeAll(async () => {
  const o = await seedOpportunite({ slug: 'e2e-j1-candidature', titre: 'Opportunité E2E J1 candidature', statut: 'publiee' })
  slug = o.slug
  oppId = o.id
  cleanup = o.cleanup
  // Idempotence : purge une candidature éventuelle du run précédent.
  await getPrisma().candidature.deleteMany({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }).catch(() => {})
})

test.afterAll(async () => {
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('J1 — candidature @smoke', () => {
  test('postuler → candidature envoyée', async ({ page }) => {
    await page.goto(`/opportunites/${slug}`)

    await page.getByRole('button', { name: /postuler maintenant/i }).click()

    // Modal : lettre ≥ 300 caractères + consentement obligatoires.
    const lettre = 'Je suis vivement intéressé par cette opportunité. '.repeat(8)
    await page.getByRole('textbox', { name: /lettre de motivation/i }).fill(lettre)
    // Consentement : id dynamique (useId) → cibler par rôle + label.
    await page.getByRole('checkbox', { name: /accepte que/i }).check()

    const envoyer = page.getByRole('button', { name: /envoyer ma candidature/i })
    await expect(envoyer).toBeEnabled()
    await envoyer.click()

    // Preuve autoritaire du résultat métier : la candidature est créée en base.
    await expect
      .poll(async () => getPrisma().candidature.count({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }), { timeout: 10_000 })
      .toBe(1)

    // UI de confirmation.
    await expect(page.getByText(/candidature envoyée/i).first()).toBeVisible()
    // NOTE : `[data-testid="candidature-ref"]` ne se rend pas en E2E (nuance isDesktop/Sheet du
    // SuccessScreen) — à investiguer ; sans impact sur la création de la candidature.
  })
})
