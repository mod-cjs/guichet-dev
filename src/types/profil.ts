export interface ExperienceItem {
  id:           string
  poste:        string
  organisation: string
  dateDebut:    string
  dateFin:      string | null
  description:  string | null
}

export interface CertificatItem {
  id:            string
  formation:     string
  obtenuLe:      string
  urlCertificat: string | null
}

export interface ProfilComplet {
  cjsUid:          string
  nom:             string
  prenom:          string
  email:           string | null
  telephone:       string | null
  region:          string | null
  commune:         string | null
  genre:           string | null
  dateNaissance:   string | null
  profil: {
    id:                string
    biographie:        string | null
    niveauEtude:       string | null
    situationEmploi:   string | null
    domainesInteret:   string[]
    competences:       string[]
    completionScore:   number
    profileVisibility: string
  } | null
  experiences: ExperienceItem[]
  certificats:  CertificatItem[]
}

// Retourné par PUT /api/profil — tous les champs à jour + score
export interface PutProfilResponse {
  region:          string | null
  commune:         string | null
  genre:           string | null
  dateNaissance:   string | null
  biographie:      string | null
  niveauEtude:     string | null
  situationEmploi: string | null
  domainesInteret: string[]
  competences:     string[]
  completionScore: number
}
