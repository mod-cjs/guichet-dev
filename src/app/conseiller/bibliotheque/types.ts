/** Types partagés du comptoir bibliothèque conseiller (GUIC-521). */
export interface EmpruntBrief {
  id: string
  livreTitre: string
  codeBarre: string
  retourLabel: string | null
  enRetard: boolean
}
export interface JeuneIdentifie {
  cjsUid: string
  name: string
  initials: string
  aRetirer: EmpruntBrief[]
  aRendre: EmpruntBrief[]
}
export interface LivrePret {
  exemplaireId: string
  titre: string
  auteur: string
  emplacement: string
}
