import { defineConfig } from '@playwright/test'

// Régression visuelle des cards Yaye (Piste C) — SÉPARÉE de la config e2e.
// Cible Storybook (les stories, pas l'app Next). 3 viewports × 2 thèmes = 6 baselines.
//
// Baseline (une fois, dans un env navigateur) :   npm run test:visual:update
// Vérification :                                  npm run test:visual
// Nécessite les navigateurs Playwright :          npx playwright install chromium
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  snapshotDir: './tests/visual/__screenshots__',
  use: {
    baseURL: process.env.STORYBOOK_URL ?? 'http://localhost:6006',
  },
  // Un seuil de tolérance évite les faux positifs d'anti-aliasing entre machines.
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  projects: [
    { name: 'mobile', use: { viewport: { width: 375, height: 812 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
  // Sert Storybook automatiquement, sauf si STORYBOOK_URL pointe déjà sur une instance.
  webServer: process.env.STORYBOOK_URL
    ? undefined
    : {
        command: 'npm run storybook',
        url: 'http://localhost:6006',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
