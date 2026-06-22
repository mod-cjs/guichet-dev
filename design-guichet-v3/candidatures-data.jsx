/* eslint-disable */
// Lot 9 — Mes candidatures · données partagées (web + mobile).
// Suivi des candidatures d'Awa Diop (cohérent avec le Lot 3 — Opportunités).

// Étapes du pipeline (ordre logique)
const CAND_STEPS = ["Envoyée", "Vue", "Présélectionné", "Entretien", "Décision"];

const CAND_STATUS = {
  envoyee:        { label: "Envoyée",        soft: "var(--gj-bg)",         ink: "var(--gj-grey)",      dot: "var(--gj-grey-2)",   icon: "i-check",        step: 1 },
  vue:            { label: "Vue",            soft: "var(--gj-blue-soft)",  ink: "var(--gj-blue-ink)",  dot: "var(--gj-blue)",     icon: "i-eye",          step: 2 },
  preselectionne: { label: "Présélectionné", soft: "var(--gj-teal-soft)",  ink: "var(--gj-teal-deep)", dot: "var(--gj-teal)",     icon: "i-bookmark",     step: 3 },
  entretien:      { label: "Entretien",      soft: "var(--gj-yellow-soft)",ink: "var(--gj-yellow-ink)",dot: "var(--gj-yellow-deep)", icon: "i-calendar", step: 4 },
  acceptee:       { label: "Acceptée",       soft: "var(--gj-green-soft)", ink: "var(--gj-green-ink)", dot: "var(--gj-green)",    icon: "i-check-circle", step: 5 },
  refusee:        { label: "Non retenue",    soft: "var(--gj-red-soft)",   ink: "var(--gj-red-ink)",   dot: "var(--gj-red)",      icon: "i-close",        step: 5 },
};

const OPP_TONE = {
  emploi: { soft: "var(--gj-blue-soft)", ink: "var(--gj-blue-ink)", icon: "i-employment", label: "Emploi" },
  stage:  { soft: "var(--gj-teal-soft)", ink: "var(--gj-teal-deep)", icon: "i-employment", label: "Stage" },
  bourse: { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)", icon: "i-funding", label: "Bourse" },
  format: { soft: "var(--gj-green-soft)", ink: "var(--gj-green-ink)", icon: "i-learning", label: "Formation" },
};

const CANDIDATURES = [
  {
    id: "c1", kind: "stage", title: "Stage Data Science · 6 mois", org: "Sonatel — Direction Innovation",
    region: "Dakar Plateau", salary: "350 000 F/mois", status: "entretien", applied: "12 mai 2026", updated: "il y a 2 j",
    next: "Entretien visio le 11 juin à 10h00", nextIcon: "i-calendar",
    timeline: [
      { st: "envoyee", label: "Candidature envoyée", date: "12 mai · 14:30", done: true },
      { st: "vue", label: "Vue par le recruteur", date: "13 mai · 09:12", done: true },
      { st: "preselectionne", label: "Présélectionné·e", date: "28 mai", done: true, note: "Ton profil a retenu l'attention de l'équipe Data." },
      { st: "entretien", label: "Entretien planifié", date: "11 juin · 10:00", done: true, current: true, note: "Visio · lien envoyé par e-mail. Prépare un projet portfolio." },
      { st: "decision", label: "Décision finale", date: "En attente", done: false },
    ],
  },
  {
    id: "c2", kind: "stage", title: "Stage agronomie · Coopérative régionale", org: "GIE Diaobé · maraîchage",
    region: "Tambacounda", salary: "180 000 F/mois", status: "preselectionne", applied: "20 mai 2026", updated: "hier",
    next: "Le recruteur peut t'appeler — garde ton téléphone à portée", nextIcon: "i-phone",
    timeline: [
      { st: "envoyee", label: "Candidature envoyée", date: "20 mai · 11:05", done: true },
      { st: "vue", label: "Vue par le recruteur", date: "21 mai · 16:40", done: true },
      { st: "preselectionne", label: "Présélectionné·e", date: "hier", done: true, current: true, note: "Tu fais partie des 6 profils retenus sur 23." },
      { st: "entretien", label: "Entretien", date: "À planifier", done: false },
      { st: "decision", label: "Décision finale", date: "—", done: false },
    ],
  },
  {
    id: "c3", kind: "bourse", title: "Bourse mobilité numérique · Master 2", org: "Min. Enseignement Supérieur",
    region: "International", salary: "frais + 80 000 F/mois", status: "vue", applied: "18 mai 2026", updated: "il y a 4 j",
    next: "Dossier en cours d'examen par la commission", nextIcon: "i-clock",
    timeline: [
      { st: "envoyee", label: "Candidature envoyée", date: "18 mai · 19:22", done: true },
      { st: "vue", label: "Vue par la commission", date: "22 mai", done: true, current: true },
      { st: "preselectionne", label: "Présélection", date: "Prévu mi-juin", done: false },
      { st: "decision", label: "Décision", date: "—", done: false },
    ],
  },
  {
    id: "c4", kind: "emploi", title: "Développeur Web Junior · CDI", org: "Wave Mobile Money",
    region: "Dakar Almadies", salary: "à partir de 500 000 F", status: "envoyee", applied: "2 juin 2026", updated: "il y a 6 j",
    next: "En attente de lecture par le recruteur", nextIcon: "i-clock",
    timeline: [
      { st: "envoyee", label: "Candidature envoyée", date: "2 juin · 08:15", done: true, current: true },
      { st: "vue", label: "Vue par le recruteur", date: "En attente", done: false },
      { st: "decision", label: "Décision", date: "—", done: false },
    ],
  },
  {
    id: "c5", kind: "emploi", title: "Analyste BI · CDD 12 mois", org: "Société Générale Sénégal",
    region: "Dakar", salary: "négociable", status: "acceptee", applied: "2 avr. 2026", updated: "le 21 mai",
    next: "Offre reçue ! Réponds avant le 15 juin", nextIcon: "i-check-circle",
    timeline: [
      { st: "envoyee", label: "Candidature envoyée", date: "2 avr.", done: true },
      { st: "vue", label: "Vue", date: "3 avr.", done: true },
      { st: "preselectionne", label: "Présélectionné·e", date: "18 avr.", done: true },
      { st: "entretien", label: "Entretien", date: "6 mai", done: true },
      { st: "acceptee", label: "Offre reçue 🎉", date: "21 mai", done: true, current: true, note: "Félicitations ! Une proposition de contrat t'attend." },
    ],
  },
  {
    id: "c6", kind: "format", title: "Bootcamp Data Analyse · 8 semaines", org: "CJS Dakar × Sonatel Academy",
    region: "Dakar Plateau", salary: "Gratuit", status: "refusee", applied: "10 mars 2026", updated: "le 2 avr.",
    next: "Non retenu·e cette session — retente en septembre", nextIcon: "i-info",
    timeline: [
      { st: "envoyee", label: "Candidature envoyée", date: "10 mars", done: true },
      { st: "vue", label: "Vue", date: "12 mars", done: true },
      { st: "refusee", label: "Non retenue", date: "2 avr.", done: true, current: true, note: "Places limitées à 24. Ton profil est éligible pour la prochaine session." },
    ],
  },
];

// Stats d'en-tête
const CAND_STATS = [
  { label: "Candidatures", value: "6", icon: "i-document", tone: "teal" },
  { label: "En cours", value: "4", icon: "i-clock", tone: "blue" },
  { label: "Entretiens", value: "1", icon: "i-calendar", tone: "yellow" },
  { label: "Taux de réponse", value: "83%", icon: "i-trending", tone: "green" },
];

Object.assign(window, { CAND_STEPS, CAND_STATUS, OPP_TONE, CANDIDATURES, CAND_STATS });
