import type { DestinataireRelance } from '@prisma/client'

/**
 * Planification d'une relance admin (GUIC-692 PR-C). Résout, pour une candidature,
 * quels couples (cible × canal) sont réellement livrables — en appliquant les findings
 * du spike : WhatsApp/SMS impossibles au candidat sans téléphone, et recruteur injoignable
 * quand l'offre n'a pas de compte lié.
 */
export type CanalRelance = 'in_app' | 'email' | 'whatsapp' | 'sms'
export type CibleRelance = 'candidat' | 'recruteur'

export interface RelancePlanInput {
  destinataire: DestinataireRelance
  canaux: CanalRelance[]
  candidatHasPhone: boolean
  recruteurResolvable: boolean
}
export interface RelanceEnvoi { cible: CibleRelance; canal: CanalRelance }
export interface RelanceIgnore extends RelanceEnvoi { raison: 'pas_de_telephone' | 'recruteur_introuvable' }
export interface RelancePlan { envois: RelanceEnvoi[]; ignores: RelanceIgnore[] }

const CIBLES: Record<DestinataireRelance, CibleRelance[]> = {
  Recruteur: ['recruteur'],
  Candidat: ['candidat'],
  Les_deux: ['candidat', 'recruteur'],
}

export function planRelance(input: RelancePlanInput): RelancePlan {
  const envois: RelanceEnvoi[] = []
  const ignores: RelanceIgnore[] = []
  for (const cible of CIBLES[input.destinataire]) {
    for (const canal of input.canaux) {
      if (cible === 'recruteur' && !input.recruteurResolvable) {
        ignores.push({ cible, canal, raison: 'recruteur_introuvable' })
        continue
      }
      if ((canal === 'whatsapp' || canal === 'sms') && cible === 'candidat' && !input.candidatHasPhone) {
        ignores.push({ cible, canal, raison: 'pas_de_telephone' })
        continue
      }
      envois.push({ cible, canal })
    }
  }
  return { envois, ignores }
}
