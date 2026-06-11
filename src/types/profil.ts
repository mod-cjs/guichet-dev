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
  fichierUrl:    string | null
}

export interface DiplomeItem {
  id:             string
  intitule:       string
  etablissement:  string
  anneeObtention: number
  niveau:         string
  mention:        string | null
  fichierUrl:     string | null
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
    photoUrl:          string | null
    biographie:        string | null
    niveauEtude:       string | null
    situationEmploi:   string | null
    domainesInteret:   string[]
    competences:       string[]
    completionScore:   number
    profileVisibility: string
    cvUrl:             string | null
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

// ── Dashboard jeune ──────────────────────────────────────────────────────────

export interface DashboardCounts {
  candidatures:   number
  eventsInscrits: number
  favoris:        number
  certificats:    number
  experiences:    number
  diplomes:       number
}

export type ActivityItem =
  | { type: 'candidature';           id: string; date: string; opportuniteTitre: string;  statut: string }
  | { type: 'inscription_evenement'; id: string; date: string; evenementTitre: string;    dateEvent: string }
  | { type: 'favori_ressource';      id: string; date: string; ressourceTitre: string }
  | { type: 'experience_ajoutee';    id: string; date: string; poste: string;             organisation: string }
  | { type: 'diplome_ajoute';        id: string; date: string; intitule: string;          anneeObtention: number }
  | { type: 'certificat_recu';       id: string; date: string; intitule: string;          urlCertificat: string | null }

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
