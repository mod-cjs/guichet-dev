import { chromium } from '@playwright/test'
const B='http://localhost:3211', U='e2e-conseiller'
const O='/private/tmp/claude-501/-Users-mouhamed-Projets-cjs-guichet/b9acfe18-3c9b-43f3-9dc3-596e1e8c5bf0/scratchpad'
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
const errs=[]; p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
await p.goto(`${B}/api/dev/login?uid=${U}&to=/conseiller/checkin`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1600)
console.log('URL     :', new URL(p.url()).pathname)
const txt = (await p.innerText('body')).split('Se déconnecter').pop().replace(/\n+/g,' | ').trim()
console.log('contenu :', txt.slice(0,220))
await p.screenshot({path:`${O}/chk-conseiller.png`, clip:{x:250,y:0,width:1190,height:780}})
console.log('erreurs :', errs.length?errs.slice(0,2):'0')
await b.close()
