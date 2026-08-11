import { chromium } from '@playwright/test'
const B='http://localhost:3211', U='e2e-conseiller'
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
await p.goto(`${B}/api/dev/login?uid=${U}&to=/conseiller/reservations`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1400)
const els = await p.$$eval('a,button,[role="tab"]', ns => ns
  .map(n => ({ tag:n.tagName, role:n.getAttribute('role'), txt:(n.textContent||'').trim().slice(0,24), href:n.getAttribute('href')||'' }))
  .filter(e => /toutes|valider|accept|refus/i.test(e.txt)))
console.log(JSON.stringify(els, null, 1))
await b.close()
