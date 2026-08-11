import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const B='http://localhost:3211', TOKEN=readFileSync('/tmp/tok.txt','utf8').trim()
const O='/private/tmp/claude-501/-Users-mouhamed-Projets-cjs-guichet/b9acfe18-3c9b-43f3-9dc3-596e1e8c5bf0/scratchpad'
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
const errs=[]; p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
await p.goto(`${B}/api/dev/login?uid=e2e-conseiller&to=/conseiller/checkin`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1000)
const r = await p.goto(`${B}/checkin/v1/${TOKEN}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500)
console.log('HTTP    :', r.status(), '| URL :', new URL(p.url()).pathname.slice(0,40))
console.log('contenu :', (await p.innerText('body')).replace(/\n+/g,' | ').slice(0,240))
await p.screenshot({path:`${O}/chk-confirm.png`, clip:{x:0,y:0,width:900,height:700}})
console.log('erreurs :', errs.length?errs.slice(0,2):'0')
await b.close()
