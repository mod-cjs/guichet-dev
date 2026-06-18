/* eslint-disable */
// Lot 10 — Espace Recruteur · données partagées (web + mobile).
// Recruteur : Aïda Mbaye · Chargée de recrutement · Sonatel — Direction Innovation.

const RECRUTEUR = { name: "Aïda Mbaye", role: "Chargée de recrutement", company: "Sonatel", initials: "AM" };

// Colonnes du pipeline kanban (cohérent avec les statuts bénéficiaire du Lot 9)
const PIPE_COLS = [
  { id: "recue", label: "Reçues", dot: "var(--gj-grey-2)", soft: "var(--gj-bg)" },
  { id: "presel", label: "Présélection", dot: "var(--gj-blue)", soft: "var(--gj-blue-soft)" },
  { id: "entretien", label: "Entretien", dot: "var(--gj-yellow-deep)", soft: "var(--gj-yellow-soft)" },
  { id: "decision", label: "Décision", dot: "var(--gj-green)", soft: "var(--gj-green-soft)" },
];

// Offres publiées par le recruteur
const R_OFFERS = [
  { id: "o1", title: "Stage Data Science · 6 mois", type: "Stage", region: "Dakar Plateau", salary: "350 000 F/mois",
    status: "Active", published: "12 mai 2026", deadline: "J-3", views: 1248, appli: 23, nouveau: 4, tone: "teal" },
  { id: "o2", title: "Développeur Web Junior · CDI", type: "Emploi", region: "Dakar Almadies", salary: "dès 500 000 F",
    status: "Active", published: "20 mai 2026", deadline: "J-12", views: 864, appli: 14, nouveau: 2, tone: "blue" },
  { id: "o3", title: "Data Analyst · alternance 12 mois", type: "Alternance", region: "Dakar", salary: "négociable",
    status: "En validation CJS", published: "—", deadline: "—", views: 0, appli: 0, nouveau: 0, tone: "yellow" },
  { id: "o4", title: "Chef de projet digital · CDD", type: "Emploi", region: "Dakar", salary: "négociable",
    status: "Clôturée", published: "2 avr. 2026", deadline: "Clôturée", views: 2106, appli: 41, nouveau: 0, tone: "grey" },
];

const OFFER_STATUS = {
  "Active":           { soft: "var(--gj-green-soft)",  ink: "var(--gj-green-ink)" },
  "En validation CJS":{ soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)" },
  "Clôturée":         { soft: "var(--gj-bg)",          ink: "var(--gj-grey)" },
  "Brouillon":        { soft: "var(--gj-bg)",          ink: "var(--gj-grey)" },
};

// Candidats reçus sur l'offre o1 (Stage Data Science), répartis dans le pipeline
const R_CANDIDATES = [
  { id: "ca1", name: "Awa Diop", init: "AD", age: 22, commune: "Tambacounda", niveau: "Bac+2 · Stats", match: 94,
    col: "entretien", applied: "12 mai", skills: ["Python", "SQL", "Excel"], fav: true,
    note: "Très bon dossier, projet scoring crédit en L2. Entretien visio prévu le 11 juin." },
  { id: "ca2", name: "Modou Sarr", init: "MS", age: 25, commune: "Koussanar", niveau: "Bac+3 · Info", match: 88,
    col: "entretien", applied: "13 mai", skills: ["Python", "Pandas", "Git"] },
  { id: "ca3", name: "Aïssatou Sow", init: "AS", age: 21, commune: "Tambacounda", niveau: "Bac+1", match: 76,
    col: "presel", applied: "15 mai", skills: ["Excel", "Stats"] },
  { id: "ca4", name: "Ibrahima Diallo", init: "ID", age: 24, commune: "Bakel", niveau: "Bac+2", match: 71,
    col: "presel", applied: "16 mai", skills: ["Python", "Web"] },
  { id: "ca5", name: "Fatou Ba", init: "FB", age: 19, commune: "Tambacounda", niveau: "Bac", match: 63,
    col: "recue", applied: "18 mai", skills: ["Bureautique"] },
  { id: "ca6", name: "Ousmane Faye", init: "OF", age: 26, commune: "Goudiry", niveau: "Bac+4", match: 81,
    col: "recue", applied: "19 mai", skills: ["R", "Stats", "SQL"] },
  { id: "ca7", name: "Ndèye Gueye", init: "NG", age: 23, commune: "Tambacounda", niveau: "Bac+3", match: 85,
    col: "recue", applied: "20 mai", skills: ["Python", "Viz"] },
  { id: "ca8", name: "Cheikh Top", init: "CT", age: 24, commune: "Koussanar", niveau: "Bac+2", match: 68,
    col: "decision", applied: "14 mai", skills: ["Excel", "SQL"], decision: "offre" },
];

// Détail candidat (fiche) — on enrichit Awa
const R_CAND_DETAIL = {
  name: "Awa Diop", init: "AD", age: 22, sex: "Femme", commune: "Tambacounda", niveau: "Bac+2 · Licence 2 Statistiques",
  match: 94, applied: "12 mai 2026", tel: "+221 77 123 45 67", email: "awa.diop@cjs.sn",
  objectif: "Micro-entreprise maraîchage & data agricole",
  skills: ["Python", "SQL", "Excel avancé", "scikit-learn", "Statistiques", "Réseaux sociaux"],
  langues: [["Wolof", "Natif"], ["Français", "Courant"], ["Anglais", "Intermédiaire"]],
  criteria: [
    { label: "Niveau d'étude (Bac+2 min.)", ok: true },
    { label: "Python obligatoire", ok: true },
    { label: "SQL souhaité", ok: true },
    { label: "Disponibilité immédiate", ok: true },
    { label: "Projet portfolio", ok: false },
  ],
  motivation: "Le stage Data Science chez Sonatel correspond exactement à mon projet : appliquer Python et le scoring à grande échelle. J'ai porté un mini-projet de scoring crédit étudiant en L2 que je peux présenter en entretien.",
};

const R_STATS = [
  { label: "Offres actives", value: "2", icon: "i-employment", tone: "blue" },
  { label: "Candidatures reçues", value: "37", icon: "i-document", tone: "teal", delta: "+6 cette semaine" },
  { label: "À examiner", value: "6", icon: "i-clock", tone: "yellow", urgent: true },
  { label: "Entretiens planifiés", value: "2", icon: "i-calendar", tone: "green" },
];

// Messagerie recruteur ↔ candidats
const R_THREADS = [
  { id: "rt1", who: "Awa Diop", init: "AD", last: "Parfait, je serai disponible le 11 à 10h.", time: "11:20", unread: 1, online: true,
    msgs: [
      { me: true, t: "Bonjour Awa, votre profil nous intéresse pour le stage Data Science. Seriez-vous disponible pour un entretien visio ?", time: "10:50" },
      { me: false, t: "Bonjour Mme Mbaye, merci beaucoup ! Oui avec plaisir.", time: "11:05" },
      { me: true, t: "Très bien. Je vous propose le mardi 11 juin à 10h00.", time: "11:12" },
      { me: false, t: "Parfait, je serai disponible le 11 à 10h.", time: "11:20" },
    ]},
  { id: "rt2", who: "Modou Sarr", init: "MS", last: "Vous : Merci pour votre candidature.", time: "Hier", unread: 0, online: false,
    msgs: [{ me: true, t: "Merci pour votre candidature, nous revenons vers vous très vite.", time: "Hier" }] },
  { id: "rt3", who: "Ndèye Gueye", init: "NG", last: "Voici mon portfolio comme demandé.", time: "Lun", unread: 0, online: false,
    msgs: [{ me: false, t: "Voici mon portfolio comme demandé.", time: "Lun" }] },
];

Object.assign(window, { RECRUTEUR, PIPE_COLS, R_OFFERS, OFFER_STATUS, R_CANDIDATES, R_CAND_DETAIL, R_STATS, R_THREADS });
