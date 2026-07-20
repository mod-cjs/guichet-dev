import { test, expect } from '@playwright/test'

// Régression visuelle de la galerie de cards Yaye (Piste C).
// Gatée par VISUAL_ACTIVE : nécessite Storybook servi + des baselines committées
// (générées une fois via `npm run test:visual:update`). Voir playwright.visual.config.ts.
const ACTIVE = process.env.VISUAL_ACTIVE === '1'

// id Storybook dérivé de title 'Yaye/YayeBlocks' + export 'Galerie'.
const STORY_ID = 'yaye-yayeblocks--galerie'

// Les 2 fonds déclarés dans .storybook/preview.tsx : page (clair) / ink (sombre).
const THEMES = [
  { name: 'clair', hex: 'F5F7F6' },
  { name: 'sombre', hex: '0A2820' },
]

for (const theme of THEMES) {
  test(`galerie cards Yaye — thème ${theme.name}`, async ({ page }) => {
    test.skip(!ACTIVE, 'VISUAL_ACTIVE=1 requis (Storybook + baselines committées)')

    await page.goto(`/iframe.html?id=${STORY_ID}&globals=backgrounds.value:!hex(${theme.hex})&viewMode=story`)
    await page.waitForSelector('#storybook-root')
    // Fige les animations d'apparition décalées des cards avant le snapshot.
    await page.waitForTimeout(700)

    await expect(page).toHaveScreenshot(`galerie-${theme.name}.png`, {
      fullPage: true,
      animations: 'disabled',
    })
  })
}
