/**
 * GUIC-153 — J2 : candidature BLOQUÉE (profil incomplet) — chemin de refus.
 * Oracle §13/§14 : profil incomplet → POST 403 PROFILE_INCOMPLETE → aucune candidature créée.
 * Identité dédiée synthétique (session incomplète : ni téléphone ni région) → refus garanti.
 */

import { test, expect } from '@playwright/test'
import { seedOpportunite } from './_fixtures/seed-e2e'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'

let cleanup: (() => Promise<void>) | undefined
let slug = ''
let oppId = ''
const UID = 'e2e-j2incomplet' // synthétisé par le mock (cookie e2e_role) — bénéficiaire sans profil

test.beforeAll(async () => {
  const o = await seedOpportunite({ slug: 'e2e-j2-refus', titre: 'Opportunité E2E J2 refus', statut: 'publiee' })
  slug = o.slug; oppId = o.id; cleanup = o.cleanup
  await getPrisma().candidature.deleteMany({ where: { cjsUid: UID, opportuniteId: oppId } }).catch(() => {})
})

test.afterAll(async () => {
  await getPrisma().candidature.deleteMany({ where: { cjsUid: UID } }).catch(() => {})
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('J2 — candidature bloquée (profil incomplet) @secondaire', () => {
  test('profil incomplet → refus, AUCUNE candidature créée', async ({ page }) => {
    // Login runtime avec une identité dédiée (session incomplète → complétude KO).
    await page.context().addCookies([{ name: 'e2e_role', value: 'j2incomplet', domain: 'localhost', path: '/' }])
    await page.goto('/auth/connexion')
    await page.getByRole('link', { name: /continuer avec mon compte cjs/i }).click()
    await page.waitForURL(/\/jeune\//)

    // La page opportunité est publique → accessible même profil incomplet.
    await page.goto(`/opportunites/${slug}`)
    await page.getByRole('button', { name: /postuler maintenant/i }).click()
    await page.getByRole('textbox', { name: /lettre de motivation/i })
      .fill('Je suis vivement intéressé par cette opportunité. '.repeat(8))
    await page.getByRole('checkbox', { name: /accepte que/i }).check()
    await page.getByRole('button', { name: /envoyer ma candidature/i }).click()

    // Preuve AUTORITAIRE du refus : aucune candidature en base + pas d'écran de succès.
    await expect
      .poll(async () => getPrisma().candidature.count({ where: { cjsUid: UID, opportuniteId: oppId } }), { timeout: 6000 })
      .toBe(0)
    await expect(page.getByTestId('candidature-ref')).toHaveCount(0)
  })
})
