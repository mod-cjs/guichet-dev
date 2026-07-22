// Résolution DB des templates d'emails — GUIC-553 évolution.
// Version du recruteur (ownerUid) ?? version système ("") ?? défaut du code.
// Les défauts/types/rendu vivent dans ./templates-defs (module sans Prisma).

import { prisma } from '@/lib/prisma'
import {
  RECRUTEUR_TEMPLATES,
  getTemplateDef,
  type ResolvedTemplate,
} from './templates-defs'

export * from './templates-defs'

/**
 * Résout un template : version du recruteur ?? version système ?? défaut du code.
 * @param ownerUid cjsUid du recruteur, ou null pour la vue admin (système).
 */
export async function resolveTemplate(cle: string, ownerUid: string | null): Promise<ResolvedTemplate | null> {
  const def = getTemplateDef(cle)
  if (!def) return null

  const owners = ownerUid ? [ownerUid, ''] : ['']
  const rows = await prisma.emailTemplate.findMany({ where: { cle, ownerUid: { in: owners } } })
  const perso = ownerUid ? rows.find((r) => r.ownerUid === ownerUid) : undefined
  const systeme = rows.find((r) => r.ownerUid === '')
  const hit = perso ?? systeme

  return {
    cle: def.cle,
    nom: def.nom,
    description: def.description,
    sujet: hit?.sujet ?? def.sujet,
    corps: hit?.corps ?? def.corps,
    source: perso ? 'recruteur' : systeme ? 'systeme' : 'defaut',
  }
}

/** Résout tout le jeu recruteur d'un coup (pour les écrans de liste). */
export async function resolveAllTemplates(ownerUid: string | null): Promise<ResolvedTemplate[]> {
  const owners = ownerUid ? [ownerUid, ''] : ['']
  const rows = await prisma.emailTemplate.findMany({ where: { ownerUid: { in: owners } } })
  const byCleOwner = new Map(rows.map((r) => [`${r.cle}::${r.ownerUid}`, r]))

  return RECRUTEUR_TEMPLATES.map((def) => {
    const perso = ownerUid ? byCleOwner.get(`${def.cle}::${ownerUid}`) : undefined
    const systeme = byCleOwner.get(`${def.cle}::`)
    const hit = perso ?? systeme
    return {
      cle: def.cle,
      nom: def.nom,
      description: def.description,
      sujet: hit?.sujet ?? def.sujet,
      corps: hit?.corps ?? def.corps,
      source: perso ? 'recruteur' : systeme ? 'systeme' : 'defaut',
    } as ResolvedTemplate
  })
}
