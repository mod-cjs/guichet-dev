// Canal WhatsApp générique — GUIC-551.
// WhatsApp business-initiated (hors fenêtre 24h) impose un TEMPLATE Meta pré-approuvé :
// on ne peut pas envoyer de texte libre. Ce canal ne livre donc QUE les événements pour
// lesquels un template est mappé (et son nom fourni en env). Sinon isConfigured=false et
// le moteur passe le canal sans erreur — jamais de contenu incorrect envoyé.

import { sendTemplateMessage } from '@/lib/whatsapp'
import { ChannelError, type ChannelMessage, type GenericChannel } from '../message'

interface TemplateMapping {
  /** Variable d'env portant le nom du template Meta approuvé. */
  templateEnv: string
  /** Nom par défaut si l'env est absent (utile en dev). */
  fallback?: string
  /** Construit les paramètres positionnels du template à partir du message. */
  params: (msg: ChannelMessage) => string[]
}

// À enrichir au fil des templates approuvés côté Meta Business Manager.
const TEMPLATES: Record<string, TemplateMapping> = {
  'candidature.statut_change': {
    templateEnv: 'WHATSAPP_TEMPLATE_CANDIDATURE_STATUT',
    params: (msg) => [msg.recipient.prenom, msg.titre],
  },
}

/** Nom du template résolu pour un événement, ou undefined si non disponible. */
function resolveTemplate(msg: ChannelMessage): { name: string; params: string[] } | undefined {
  const map = TEMPLATES[msg.eventKey]
  if (!map) return undefined
  const name = process.env[map.templateEnv] ?? map.fallback
  if (!name) return undefined
  return { name, params: map.params(msg) }
}

/** 4xx (hors 429) = permanent (numéro invalide, opt-out, template rejeté) ; 429/5xx = retry. */
function isPermanent(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 429
}

export const whatsappGenericChannel: GenericChannel = {
  id: 'whatsapp',

  isConfigured(msg) {
    return Boolean(msg.recipient.telephone) && resolveTemplate(msg) !== undefined
  },

  async send(msg) {
    const tpl = resolveTemplate(msg)
    if (!msg.recipient.telephone || !tpl) {
      throw new ChannelError(`WhatsApp: pas de template pour ${msg.eventKey}`, true)
    }
    try {
      await sendTemplateMessage(msg.recipient.telephone, tpl.name, 'fr', tpl.params)
    } catch (err) {
      const status = (err as { status?: number }).status
      throw new ChannelError(
        err instanceof Error ? err.message : 'envoi WhatsApp échoué',
        isPermanent(status),
      )
    }
  },
}
