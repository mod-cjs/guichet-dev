import { chromium } from '@playwright/test'
const B='http://localhost:3211', U='e2e-conseiller'
const O='/private/tmp/claude-501/-Users-mouhamed-Projets-cjs-guichet/b9acfe18-3c9b-43f3-9dc3-596e1e8c5bf0/scratchpad'
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:1000}}); const p=await c.newPage()
const errs=[]; p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
await p.goto(`${B}/api/dev/login?uid=${U}&to=/conseiller`,{waitUntil:'domcontentloaded'})
await p.waitForTimeout(1800)
console.log('URL     :', new URL(p.url()).pathname)
await p.screenshot({path:`${O}/cons-dashboard.png`, fullPage:true})
console.log('erreurs :', errs.length?errs.slice(0,3):'0')
await b.close()
