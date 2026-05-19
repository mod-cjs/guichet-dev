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

export interface DiplomeItem {
  id:             string
  intitule:       string
  etablissement:  string
  anneeObtention: number
  niveau:         string
  mention:        string | null
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
  diplomes:    DiplomeItem[]
  certificats:  CertificatItem[]
}

// Retourné par POST/PUT /api/profil/experiences
export interface ExperienceResponse extends ExperienceItem {
  completionScore: number
}

// Retourné par DELETE /api/profil/experiences/:id
export interface DeleteExperienceResponse {
  completionScore: number
}

// Retourné par POST/PUT /api/profil/diplomes
export interface DiplomeResponse extends DiplomeItem {
  completionScore: number
}

// Retourné par DELETE /api/profil/diplomes/:id
export interface DeleteDiplomeResponse {
  completionScore: number
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
