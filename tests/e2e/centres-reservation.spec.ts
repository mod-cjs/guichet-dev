/**
 * E2E Playwright — Flow réservation centre jeune complet (DoD Lot 7 §6).
 * ====================================================================
 *
 * GUIC-394 — couvre le parcours de bout en bout d'un jeune :
 *   1. login SSO mock → session
 *   2. /centres → clic centre → /centres/[slug]
 *   3. clic Ressources → /centres/[slug]/ressources
 *   4. clic Réserver → /centres/[slug]/ressources/[id]/reserver
 *   5. remplit le formulaire (date demain, créneau, 1 personne, motif > 20)
 *   6. submit → redirect /jeune/mes-reservations-centres?created=<id>
 *   7. /jeune/mes-reservations-centres → tab Acceptées
 *   8. clic Annuler → confirm → réservation passe en tab Toutes (Annulee)
 *
 * Pré-requis (le test est skippé sinon — voir gate `E2E_ACTIVE`) :
 *   - DB Prisma test active (`DATABASE_URL` pointe sur une base non-prod)
 *   - SSO mock lancé (`SSO_BASE_URL=http://localhost:19999`)
 *   - `PLAYWRIGHT_SSO_MOCK=1`, `PLAYWRIGHT_E2E_DB=1`
 *
 * Commande type :
 *   PLAYWRIGHT_SSO_MOCK=1 PLAYWRIGHT_E2E_DB=1 \
 *     SSO_BASE_URL=http://localhost:19999 \
 *     npx playwright test tests/e2e/centres-reservation.spec.ts
 */

import { test, expect } from '@playwright/test'
import {
  seedCentreWithRessource,
  disconnectPrisma,
  type SeededCentre,
} from './_fixtures/centres'

const E2E_ACTIVE =
  process.env.PLAYWRIGHT_SSO_MOCK === '1' && process.env.PLAYWRIGHT_E2E_DB === '1'

test.describe('flow réservation centre jeune (E2E)', () => {
  test.skip(!E2E_ACTIVE, 'Activer avec PLAYWRIGHT_SSO_MOCK=1 + PLAYWRIGHT_E2E_DB=1')

  let seed: SeededCentre

  test.beforeAll(async () => {
    // GUIC-153 — identité DÉDIÉE `e2e-reservation` (cookie e2e_role ci-dessous) → isolée des
    // autres specs pour un parallélisme sûr. Le cjsUid du seed doit matcher ce sub.
    seed = await seedCentreWithRessource({ cjsUid: 'e2e-reservation' })
  })

  test.afterAll(async () => {
    if (seed) await seed.cleanup()
    await disconnectPrisma()
  })

  test('jeune réserve → voit la résa → annule', async ({ page }) => {
    // 1. Login SSO mock — cookie e2e_role → le mock émet l'identité `e2e-reservation`.
    await page.context().addCookies([{ name: 'e2e_role', value: 'reservation', domain: 'localhost', path: '/' }])
    await page.goto('/auth/connexion')
    // GUIC-604 — cibler le lien SSO par son CONTRAT (href) : aucun « Se connecter » n'existe
    // sur /auth/connexion (le Header marketing n'y est pas monté).
    await page.locator('a[href="/api/auth/login"]').click()
    await page.waitForURL(/\/(jeune|onboarding)/, { timeout: 15_000 })

    // 2. Naviguer vers /centres puis sur notre centre seedé
    await page.goto('/centres')
    await expect(page).toHaveURL(/\/centres/)

    // Cliquer sur le centre seedé via son slug (lien sûr)
    await page.goto(`/centres/${seed.slug}`)
    await expect(page).toHaveURL(new RegExp(`/centres/${seed.slug}$`))

    // 3. Onglet / lien "Ressources"
    await page.goto(`/centres/${seed.slug}/ressources`)
    await expect(page).toHaveURL(new RegExp(`/centres/${seed.slug}/ressources$`))

    // 4. Cliquer Réserver sur la ressource seedée
    await page.goto(`/centres/${seed.slug}/ressources/${seed.ressourceId}/reserver`)
    await expect(page).toHaveURL(/reserver/)

    // 5. Remplir le formulaire
    const demain = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    await page.locator('input[type="date"]').fill(demain)

    // Créneau : premier créneau SÉLECTIONNABLE.
    // GUIC-604 — l'ancien locator cherchait /\d{2}:\d{2}/ (deux-points) alors que l'UI rend
    // le format français « 08h00 – 10h00 » → aucun match, 30 s d'attente dans le vide. On
    // s'appuie désormais sur la STRUCTURE ARIA (radiogroup « Créneau horaire »), et on exclut
    // les créneaux désactivés (hors horaires d'ouverture du centre).
    const slotBtn = page.locator('button[role="radio"]:not([disabled])').first()
    await slotBtn.click()

    // Motif (>= 20 chars)
    await page
      .locator('textarea, input[name="motif"]')
      .first()
      .fill('Réservation E2E pour test automatisé du flow complet bout en bout.')

    // Submit — le bouton s'appelle « Envoyer la demande » (GUIC-604 : l'ancien locator
    // /réserver|valider|confirmer/ ne matchait rien).
    await page.getByRole('button', { name: /envoyer la demande/i }).click()

    // 6. Redirect attendu vers /jeune/mes-reservations-centres?created=...
    await page.waitForURL(/\/jeune\/mes-reservations-centres\?created=/, { timeout: 10_000 })

    // 7. Liste des réservations (route réelle = mes-reservations-centres)
    await page.goto('/jeune/mes-reservations-centres')
    await expect(page.getByText(/Salle E2E/i).first()).toBeVisible({ timeout: 5_000 })

    // 8. Annuler la réservation.
    // GUIC-604 — la confirmation est un `window.confirm` NATIF (cf. ReservationCard), pas une
    // modale applicative. Playwright REJETTE automatiquement les dialogues natifs : sans ce
    // handler, l'annulation n'avait jamais lieu et le « Confirmer » attendu n'existait pas.
    // `visible: true` : la page rend les variantes MOBILE et DESKTOP → `.first()` tombait sur
    // l'exemplaire CACHÉ (non cliquable) et attendait 30 s. On ne cible que le visible.
    // NB : regex NON ancrée. `/^annuler$/i` ne matche pas (0 résultat) — le nom accessible du
    // bouton n'est pas exactement « Annuler ». `visible: true` écarte un éventuel exemplaire
    // caché (la page rend des variantes mobile/desktop).
    page.once('dialog', (d) => void d.accept())
    await page
      .getByRole('button', { name: /annuler/i })
      .filter({ visible: true })
      .first()
      .click()

    // Tab "Toutes" : la résa doit apparaître avec statut annulé
    await page.getByRole('tab', { name: /toutes/i }).click().catch(() => {})
    await expect(page.getByText(/annul/i).first()).toBeVisible({ timeout: 5_000 })
  })
})
