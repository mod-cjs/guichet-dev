/**
 * GUIC-153 — @smoke X1 : chaîne cross-espace (golden path).
 * admin publie → jeune candidate → recruteur retient → jeune voit « Retenue ».
 * Trois rôles = trois contextes navigateur (storageState par rôle) dans un seul test.
 */

import { test, expect } from '@playwright/test'
import { seedOpportunite, E2E_UIDS } from './_fixtures/seed-e2e'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

let cleanup: (() => Promise<void>) | undefined
const SLUG = 'e2e-x1-chain'
const TITRE = 'Opportunité E2E X1 chaîne'
let oppId = ''

test.beforeAll(async () => {
  // Brouillon appartenant au recruteur (il sera publié par l'admin puis décidé par le recruteur).
  const o = await seedOpportunite({ slug: SLUG, titre: TITRE, statut: 'brouillon', recruteurUid: E2E_UIDS.recruteur })
  oppId = o.id
  cleanup = o.cleanup
  await getPrisma().candidature.deleteMany({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }).catch(() => {})
})

test.afterAll(async () => {
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('X1 — chaîne cross-espace @smoke', () => {
  test('admin publie → jeune candidate → recruteur retient → jeune voit Retenue', async ({ browser }) => {
    const prisma = getPrisma()

    // 1) ADMIN publie le brouillon.
    const admin = await browser.newContext({ storageState: storageStatePath('admin') })
    const aPage = await admin.newPage()
    aPage.on('dialog', (d) => d.accept())
    await aPage.goto('/admin/opportunites')
    const carte = aPage.locator('div').filter({ hasText: TITRE }).filter({ has: aPage.getByRole('button', { name: /^approuver$/i }) }).last()
    await carte.getByRole('button', { name: /^approuver$/i }).click()
    await expect.poll(async () => (await prisma.opportunite.findUnique({ where: { slug: SLUG }, select: { statut: true } }))?.statut, { timeout: 8000 }).toBe('publiee')
    await admin.close()

    // 2) JEUNE candidate.
    const jeune = await browser.newContext({ storageState: storageStatePath('jeune') })
    const jPage = await jeune.newPage()
    await jPage.goto(`/opportunites/${SLUG}`)
    await jPage.getByRole('button', { name: /postuler maintenant/i }).click()
    await jPage.getByRole('textbox', { name: /lettre de motivation/i }).fill('Je suis vivement intéressé par cette opportunité. '.repeat(8))
    await jPage.getByRole('checkbox', { name: /accepte que/i }).check()
    await jPage.getByRole('button', { name: /envoyer ma candidature/i }).click()
    await expect.poll(async () => prisma.candidature.count({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }), { timeout: 10_000 }).toBe(1)
    const cand = await prisma.candidature.findFirstOrThrow({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId }, select: { id: true } })
    await jeune.close()

    // 3) RECRUTEUR retient le candidat.
    const recruteur = await browser.newContext({ storageState: storageStatePath('recruteur') })
    const rPage = await recruteur.newPage()
    await rPage.goto(`/recruteur/candidatures/${cand.id}`)
    await rPage.getByRole('button', { name: /^retenir$/i }).click()
    await expect.poll(async () => (await prisma.candidature.findUnique({ where: { id: cand.id }, select: { statut: true } }))?.statut, { timeout: 8000 }).toBe('Retenue')
    await recruteur.close()

    // 4) JEUNE voit le statut « retenue/acceptée » dans son suivi.
    const jeune2 = await browser.newContext({ storageState: storageStatePath('jeune') })
    const j2 = await jeune2.newPage()
    await j2.goto('/jeune/mes-candidatures')
    const dossier = j2.locator('article').filter({ hasText: TITRE }).first()
    await expect(dossier).toBeVisible()
    await expect(dossier.getByTestId('candidature-status-pill')).toContainText(/acceptée|retenue/i)
    await jeune2.close()
  })
})
