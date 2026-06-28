// Formateur de sortie WhatsApp (GUIC-263, Lot 5) — traduit la réponse normalisée
// (blocs) en messages WhatsApp adaptés : TEXTE (opportunités = liste numérotée +
// deep link) + messages INTERACTIFS Meta (boutons ≤3 / liste ≤10) pour les
// quick_replies. Le moteur (Groq) ignore le canal ; c'est ici qu'on adapte.
// Contraintes Meta (GUIC-317) : 4096 car./texte, 3 boutons (20 car.), 10 lignes (24 car.).

import type { YayeBlock } from './blocks'
import { appUrl } from '@/lib/app-url'
import { sendTextMessage, sendInteractiveButtons, sendInteractiveList } from '@/lib/whatsapp'

const APP_URL = appUrl()
const MAX_LEN = 4096
const MAX_ITEMS = 10 // liste interactive Meta : 10 éléments max
/** Au-delà de N échanges WhatsApp, on invite (une fois) à passer sur le web. */
const WEB_SWITCH_AFTER_EXCHANGES = 5

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
    } else if (b.kind === 'escalade') {
      // Accusé de réception d'escalade : titre + attente + référence à citer.
      parts.push([`*${b.title}*`, b.message, `Référence : ${b.reference}`].filter(Boolean).join('\n'))
    } else {
      // action : on résume en texte (les boutons riches n'existent pas en texte brut)
      const head = [b.title, b.subtitle].filter(Boolean).join(' — ')
      if (head) parts.push(head)
    }
  }

  const out = parts.filter(Boolean).join('\n\n') || "Je n'ai pas de réponse pour le moment."
  return out.length > MAX_LEN ? out.slice(0, MAX_LEN - 1) + '…' : out
}

/** Option interactive normalisée (id = valeur d'action renvoyée au tap). */
export interface WhatsAppDeliveryOption {
  id: string
  title: string
}

/** Plan d'envoi WhatsApp : un texte + un éventuel message interactif. PUR (testable). */
export interface WhatsAppDeliveryPlan {
  /** Texte principal (vide si rien à dire hors interactif). */
  text: string
  interactive: { kind: 'buttons' | 'list'; body: string; buttonLabel: string; options: WhatsAppDeliveryOption[] } | null
}

/**
 * Décide quoi envoyer sur WhatsApp à partir des blocs normalisés :
 * - texte + opportunités + résumé des actions → message texte ;
 * - quick_replies → boutons (≤3) ou liste (4–10). L'`id` porte la VALEUR d'action
 *   (renvoyée par Meta au tap) ; le `title` est le libellé affiché.
 */
export function planWhatsAppDelivery(blocks: YayeBlock[]): WhatsAppDeliveryPlan {
  const textBlocks = blocks.filter(b => b.kind !== 'quick_replies')
  const text = textBlocks.length ? formatBlocksForWhatsApp(textBlocks) : ''
  const qr = blocks.find((b): b is Extract<YayeBlock, { kind: 'quick_replies' }> => b.kind === 'quick_replies')
  const replies = qr?.replies ?? []
  if (replies.length === 0) return { text, interactive: null }

  const options: WhatsAppDeliveryOption[] = replies.slice(0, MAX_ITEMS).map((r, i) => ({
    id: (r.value || r.label || `qr_${i}`).slice(0, 256),
    title: (r.label || r.value || `Option ${i + 1}`).trim(),
  }))
  const kind: 'buttons' | 'list' = options.length <= 3 ? 'buttons' : 'list'
  return { text, interactive: { kind, body: 'Que veux-tu faire ?', buttonLabel: 'Choisir', options } }
}

/**
 * Envoie la réponse normalisée sur WhatsApp dans le bon format (texte + interactif).
 * Retourne les `formats` réellement émis (pour journaliser `format_canal`).
 */
export async function sendYayeBlocksToWhatsApp(to: string, blocks: YayeBlock[]): Promise<{ formats: string[] }> {
  const { text, interactive } = planWhatsAppDelivery(blocks)
  const formats: string[] = []

  if (text.trim()) {
    await sendTextMessage(to, text)
    formats.push('text')
  }
  if (interactive) {
    if (interactive.kind === 'buttons') {
      await sendInteractiveButtons(to, interactive.body, interactive.options.slice(0, 3))
      formats.push('interactive_buttons')
    } else {
      await sendInteractiveList(to, interactive.body, interactive.buttonLabel, interactive.options.slice(0, 10))
      formats.push('interactive_list')
    }
  }
  if (formats.length === 0) {
    await sendTextMessage(to, "Je n'ai pas de réponse pour le moment.")
    formats.push('text')
  }
  return { formats }
}

/** Vrai une seule fois (au passage du seuil) pour proposer la bascule web. */
export function shouldSuggestWeb(priorHistoryLength: number): boolean {
  return Math.floor(priorHistoryLength / 2) === WEB_SWITCH_AFTER_EXCHANGES
}

/** Invitation à poursuivre sur le web (deep link). */
export function webSwitchMessage(): string {
  return `Pour une expérience complète (cards, badge, PDF), continue sur le Guichet : ${APP_URL}/jeune/yaye`
}
