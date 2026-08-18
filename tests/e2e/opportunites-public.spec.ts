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
  // Domaines valides pour la taxonomie courante (BienEtre/Citoyennete/Culture/Ecologie/
  // Economie/Employabilite/Autre) — les anciennes valeurs (Numerique/Agriculture/Education)
  // ont été retirées par la refonte de la taxonomie, invalides silencieusement jusqu'ici
  // (le cast `as never` de seedOpportunite masque l'erreur au compile-time).
  const a = await seedOpportunite({ slug: 'e2e-p2-dev-stage', titre: DEV_TITRE, type: 'Stage', domaine: 'Employabilite' })
  const b = await seedOpportunite({ slug: 'e2e-p2-agri-emploi', titre: AGRI_TITRE, type: 'Emploi', domaine: 'Ecologie' })
  const c = await seedOpportunite({ slug: 'e2e-p2-bourse', titre: 'Bourse etudes E2E P2', type: 'Bourse', domaine: 'Economie' })
  stageSlug = a.slug
  cleanup = combineCleanups(a.cleanup, b.cleanup, c.cleanup)
})

test.afterAll(async () => {
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('P2 — recherche opportunité publique @smoke', () => {
  test('liste → recherche → détail (anonyme)', async ({ page }, testInfo) => {
    // Écran 1 : la liste publique rend des cartes.
    await page.goto('/opportunites')
    await expect(page.locator('[data-testid="opp-card"]').first()).toBeVisible()

    // Recherche : vérifiée sur DESKTOP (le flux de recherche mobile diffère — input distinct,
    // couvert séparément). Terme du SEED (déjà indexé) — on ne cherche PAS l'opp fraîchement
    // seedée : l'index full-text InnoDB n'indexe pas immédiatement une ligne juste insérée.
    // Assertion au niveau de la RÉPONSE API (indépendante du rendu).
    if (!testInfo.project.name.includes('Mobile')) {
      const search = page.locator('input[type="search"]').filter({ visible: true }).first()
      const respPromise = page.waitForResponse((r) => /\/api\/opportunites\?.*q=/.test(r.url()) && r.ok())
      await search.fill('Développeur')
      const json = await (await respPromise).json()
      expect((json.data ?? []).some((o: { titre: string }) => /développeur/i.test(o.titre))).toBeTruthy()
    }

    // Écran 2 : détail de NOTRE opp (nav directe par slug, indépendante du full-text).
    await page.goto(`/opportunites/${stageSlug}`)
    // Double DOM (fil d'Ariane + titre, mobile+web) → cibler la variante VISIBLE.
    await expect(page.getByText(DEV_TITRE).filter({ visible: true }).first()).toBeVisible()

    // Anonyme : CTA de connexion, PAS de bouton « Postuler maintenant » (∅).
    await expect(page.getByRole('link', { name: /se connecter pour postuler/i }).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /postuler maintenant/i })).toHaveCount(0)
  })
})
