import { chromium } from '@playwright/test'
const B='http://localhost:3211', U='e2e-conseiller'
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
await p.goto(`${B}/api/dev/login?uid=${U}&to=/conseiller`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200)
for (const tab of ['', '?tab=attente', '?tab=acceptee', '?tab=refusee']) {
  await p.goto(`${B}/conseiller/reservations${tab}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(900)
  const txt = await p.innerText('body')
  const lignes = (txt.match(/demandé/g)||[]).length
  const vide = /aucune réservation|rien à valider|aucun/i.test(txt.split('Se déconnecter').pop())
  console.log(`${(tab||'(defaut)').padEnd(16)} lignes=${lignes}  etat_vide=${vide}`)
}
await b.close()
