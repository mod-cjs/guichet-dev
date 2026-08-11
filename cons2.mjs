import { chromium } from '@playwright/test'
const B='http://localhost:3211', U='e2e-conseiller'
const O='/private/tmp/claude-501/-Users-mouhamed-Projets-cjs-guichet/b9acfe18-3c9b-43f3-9dc3-596e1e8c5bf0/scratchpad'
const ECRANS = [
  ['reservations','/conseiller/reservations'], ['beneficiaires','/conseiller/beneficiaires'],
  ['agenda','/conseiller/agenda'], ['checkin','/conseiller/checkin'],
  ['publications','/conseiller/publications'], ['messagerie','/conseiller/messagerie'],
]
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
await p.goto(`${B}/api/dev/login?uid=${U}&to=/conseiller`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200)
for (const [nom, url] of ECRANS) {
  const errs=[]; const h=(m)=>m.type()==='error'&&errs.push(m.text()); p.on('console',h)
  await p.goto(B+url,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1100)
  const txt = (await p.innerText('body')).replace(/\n+/g,' | ')
  const apresNav = txt.split('Se déconnecter').pop().trim()
  console.log(`${nom.padEnd(15)} ${apresNav.slice(0,105)}`)
  await p.screenshot({path:`${O}/cons-${nom}.png`, clip:{x:260,y:0,width:1180,height:760}})
  if (errs.length) console.log(`${''.padEnd(15)} ⚠ ${errs.slice(0,1)}`)
  p.off('console',h)
}
await b.close()
