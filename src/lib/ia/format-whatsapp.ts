// Formateur de sortie WhatsApp — traduit la réponse normalisée (blocs) en TEXTE.
// WhatsApp ne rend ni HTML ni cards : les opportunités deviennent une liste
// numérotée avec deep link vers le Guichet (spec doc 04 §Présentation des résultats).
// Contrainte Meta : 4096 caractères max par message.

import type { YayeBlock } from './blocks'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://guichet.consortiumjeunessesenegal.org').replace(/\/$/, '')
const MAX_LEN = 4096
const MAX_ITEMS = 10 // liste interactive Meta : 10 éléments max

export function formatBlocksForWhatsApp(blocks: YayeBlock[]): string {
  const parts: string[] = []

  for (const b of blocks) {
    if (b.kind === 'text') {
      // Markdown-lite → WhatsApp : `**gras**` devient `*gras*` (les puces `- ` restent).
      const txt = b.text.trim().replace(/\*\*([^*]+)\*\*/g, '*$1*')
      if (txt) parts.push(txt)
    } else if (b.kind === 'opportunites') {
      const lines = b.items.slice(0, MAX_ITEMS).map((o, i) => {
        const meta = [o.type, o.region].filter(Boolean).join(' · ')
        return `${i + 1}. *${o.titre}*` + (meta ? `\n   ${meta}` : '') +
          (o.note ? `\n   ${o.note}` : '') + `\n   ${APP_URL}/opportunites/${o.slug}`
      })
      if (lines.length) parts.push(lines.join('\n'))
    } else if (b.kind === 'quick_replies') {
      // Pas de boutons en texte brut : on invite à répondre par l'une des options.
      const opts = b.replies.map(r => `• ${r.label}`).join('\n')
      if (opts) parts.push(`Réponds par :\n${opts}`)
    } else {
      // action : on résume en texte (les boutons riches n'existent pas en texte brut)
      const head = [b.title, b.subtitle].filter(Boolean).join(' — ')
      if (head) parts.push(head)
    }
  }

  const out = parts.filter(Boolean).join('\n\n') || "Je n'ai pas de réponse pour le moment."
  return out.length > MAX_LEN ? out.slice(0, MAX_LEN - 1) + '…' : out
}
