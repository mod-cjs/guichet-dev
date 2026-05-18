interface IdentiteForScore {
  region:        unknown
  commune:       unknown
  genre:         unknown
  dateNaissance: unknown
}

interface ProfilForScore {
  biographie:      unknown
  niveauEtude:     unknown
  situationEmploi: unknown
  domainesInteret: unknown
  competences:     unknown
}

export function calculerScore(
  identite: IdentiteForScore,
  profil:   ProfilForScore | null,
  expCount: number,
): number {
  let s = 0
  if (identite.region)        s += 10
  if (identite.genre)         s += 5
  if (identite.dateNaissance) s += 5
  if (identite.commune)       s += 5
  if (profil?.biographie)     s += 20
  if (profil?.niveauEtude)    s += 10
  if (profil?.situationEmploi) s += 10
  if (Array.isArray(profil?.domainesInteret) && (profil.domainesInteret as unknown[]).length) s += 15
  if (Array.isArray(profil?.competences)     && (profil.competences     as unknown[]).length) s += 10
  if (expCount > 0)            s += 10
  return Math.min(s, 100)
}
