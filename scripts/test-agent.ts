/**
 * Test manuel de l'agent Yaye (hors HTTP/auth) — GUIC-259, Lot 0.
 *
 * Appelle directement `runAgent` → Groq (function calling) + outils Prisma + journalisation.
 * Usage :
 *   GROQ_API_KEY=... DATABASE_URL=mysql://... YAYE_TEST_UID=<cjs_uid> \
 *     npx tsx scripts/test-agent.ts "ton message"
 */
import { config } from 'dotenv'
import { runAgent } from '@/lib/ia/agent'

// Charge .env.local (GROQ_API_KEY + DATABASE_URL → base enrichie). Avant tout appel runtime.
config({ path: '.env.local', override: true })

async function main() {
  const message = process.argv[2] ?? 'Bonjour Yaye'
  const cjsUid = process.env.YAYE_TEST_UID ?? 'test-uid'

  console.log(`\n>>> message : ${message}`)
  console.log(`>>> cjsUid  : ${cjsUid}\n`)

  const t0 = Date.now()
  const r = await runAgent({
    message,
    cjsUid,
    roles: ['beneficiaire'],
    sessionId: `test-${Date.now()}`,
    canal: 'web',
  })
  const ms = Date.now() - t0

  console.log('=== REPLY ===')
  console.log(r.reply)
  console.log(`\n=== OUTILS UTILISÉS === ${JSON.stringify(r.toolsUsed)}  (${ms} ms)`)
  console.log('=== BLOCS ===')
  for (const b of r.blocks) {
    if (b.kind === 'text') console.log(`[text] ${b.text.slice(0, 160)}`)
    else if (b.kind === 'opportunites') {
      console.log(`[opportunites] ${b.items.length} card(s) :`)
      b.items.forEach(o => console.log(`   • ${o.titre} — ${o.type} · ${o.region ?? '?'} → /opportunites/${o.slug}`))
    } else console.log(`[action] ${b.title ?? ''}`)
  }
  process.exit(0)
}

main().catch(e => {
  console.error('ERREUR:', e)
  process.exit(1)
})
