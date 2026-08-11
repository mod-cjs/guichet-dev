import { chromium } from '@playwright/test'
const B='http://localhost:3211', U='000016dd-3ec7-4d17-aa8c-7dcc58cd0835'
const O='/private/tmp/claude-501/-Users-mouhamed-Projets-cjs-guichet/b9acfe18-3c9b-43f3-9dc3-596e1e8c5bf0/scratchpad'
const ECRANS = [
  ['dashboard','/recruteur/tableau-de-bord'], ['offres','/recruteur/mes-offres'],
  ['pipeline','/recruteur/candidatures'], ['entretiens','/recruteur/entretiens'],
  ['entreprise','/recruteur/profil-entreprise'], ['messagerie','/recruteur/messagerie'],
]
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
await p.goto(`${B}/api/dev/login?uid=${U}&to=/recruteur/tableau-de-bord`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1400)
for (const [nom, url] of ECRANS) {
  const errs=[]; const h=(m)=>m.type()==='error'&&errs.push(m.text()); p.on('console',h)
  const r = await p.goto(B+url,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1100)
  const txt = (await p.innerText('body')).replace(/\n+/g,' | ')
  const corps = txt.split('Se déconnecter').pop().trim() || txt.slice(0,110)
  console.log(`${nom.padEnd(12)} ${r.status()}  ${corps.slice(0,95)}`)
  await p.screenshot({path:`${O}/recr-${nom}.png`, clip:{x:250,y:0,width:1190,height:780}})
  if (errs.length) console.log(`${''.padEnd(12)} ⚠ ${errs.slice(0,1)}`)
  p.off('console',h)
}
await b.close()
