import { chromium } from '@playwright/test'
const B='http://localhost:3211', U='e2e-conseiller'
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
await p.goto(`${B}/api/dev/login?uid=${U}&to=/conseiller/reservations`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1400)
// Les onglets filtrent-ils REELLEMENT ? (defaut trouve sur les opportunites)
for (const onglet of ['Toutes','À valider','Acceptées','Refusées']) {
  const t = p.getByRole('button',{name:new RegExp(`^${onglet}`)}).first()
  if (!(await t.count())) { console.log(`${onglet.padEnd(11)} onglet introuvable`); continue }
  await t.click(); await p.waitForTimeout(700)
  const cartes = await p.locator('article, li').filter({hasText:/demandé/}).count()
  console.log(`${onglet.padEnd(11)} URL=${new URL(p.url()).search||'(aucun param)'}  lignes=${cartes}`)
}
await b.close()
