/* eslint-disable */
// Événements — données + helpers de tons partagés (web + mobile).
// Palettes signature issues de tokens.css (--prog-*).

// NB : les tokens --prog-* sont orphelins dans tokens.css (hors :root) → on
// utilise des dégradés hex littéraux (couleurs signature des programmes CJS).
const EV_TONES = {
  atelier:    { soft: "var(--gj-teal-soft)",   ink: "var(--gj-teal-deep)", grad: "linear-gradient(135deg,#0A807F,#0D4D3A)", label: "Atelier",     icon: "i-learning" },
  forum:      { soft: "var(--gj-blue-soft)",   ink: "var(--gj-blue-ink)",  grad: "linear-gradient(135deg,#1A4ED8,#0E2A7A)", label: "Forum emploi", icon: "i-employment" },
  formation:  { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)",grad: "linear-gradient(135deg,#A3742A,#5C4118)", label: "Formation",    icon: "i-project" },
  webinaire:  { soft: "var(--gj-green-soft)",  ink: "var(--gj-green-ink)", grad: "linear-gradient(135deg,#15803D,#082F19)", label: "Webinaire",    icon: "i-video" },
  conference: { soft: "var(--gj-teal-soft)",   ink: "var(--gj-teal-deep)", grad: "linear-gradient(135deg,#007A5C,#0A2820)", label: "Conférence",   icon: "i-engagement" },
};

const EV_MODE = {
  "Présentiel": { icon: "i-pin",   color: "var(--gj-teal-deep)" },
  "En ligne":   { icon: "i-globe", color: "var(--gj-green-ink)" },
  "Hybride":    { icon: "i-bolt",  color: "var(--gj-yellow-ink)" },
};

// Master list — "à venir"
const EVENTS = [
  {
    id: "cv", type: "atelier", title: "Atelier CV & lettre de motivation",
    org: "CJS Tambacounda", d: 22, m: "Mai", y: 2026, weekday: "Jeudi",
    time: "14h00 – 17h00", mode: "Présentiel", place: "CJS Tambacounda · Av. L. S. Senghor",
    seats: 5, total: 20, price: "Gratuit", registered: true, urgent: true,
    blurb: "Construis un CV qui décroche des entretiens et adapte ta lettre à chaque offre, accompagné d'un conseiller emploi.",
  },
  {
    id: "forum", type: "forum", title: "Forum régional de l'emploi",
    org: "ANPEJ · Région de Dakar", d: 28, m: "Mai", y: 2026, weekday: "Mardi",
    time: "09h00 – 18h00", mode: "Présentiel", place: "Sphère Ministérielle · Diamniadio",
    seats: 230, total: 500, price: "Gratuit", registered: false,
    blurb: "Plus de 40 recruteurs, des entretiens flash et des espaces conseils. Apporte plusieurs CV imprimés.",
  },
  {
    id: "bootcamp", type: "formation", title: "Bootcamp Data Analyse",
    org: "CJS Dakar × Sonatel Academy", d: 2, m: "Juin", y: 2026, weekday: "Mardi",
    time: "8 semaines · lun–ven", mode: "Présentiel", place: "CJS Dakar Plateau",
    seats: 3, total: 24, price: "Gratuit", registered: false, urgent: true,
    blurb: "Du tableur au tableau de bord : Excel, SQL et visualisation. Sélection sur dossier, places très limitées.",
  },
  {
    id: "webfin", type: "webinaire", title: "Financer son projet agricole",
    org: "La Délégation à l'Entrepreneuriat Rapide", d: 5, m: "Juin", y: 2026, weekday: "Vendredi",
    time: "18h00 – 19h30", mode: "En ligne", place: "Lien Zoom envoyé après inscription",
    seats: 480, total: 1000, price: "Gratuit", registered: false,
    blurb: "Panorama des dispositifs de financement (DER, microcrédit, bourses CJS) et comment monter un dossier solide.",
  },
  {
    id: "conf", type: "conference", title: "Jeunesse & Entrepreneuriat 2026",
    org: "Ministère de la Jeunesse", d: 10, m: "Juin", y: 2026, weekday: "Mercredi",
    time: "10h00 – 16h00", mode: "Hybride", place: "Grand Théâtre · Dakar (+ streaming)",
    seats: 120, total: 400, price: "Gratuit", registered: false,
    blurb: "Témoignages d'entrepreneurs, ateliers thématiques et networking. Participe sur place ou en direct.",
  },
  {
    id: "pitch", type: "atelier", title: "Initiation à la prise de parole",
    org: "CJS Kaolack", d: 14, m: "Juin", y: 2026, weekday: "Dimanche",
    time: "10h00 – 13h00", mode: "Présentiel", place: "CJS Kaolack · Médina Baye",
    seats: 12, total: 25, price: "Gratuit", registered: false,
    blurb: "Gagne en aisance pour pitcher ton projet et passer tes entretiens avec assurance.",
  },
];

// Événements passés (pour « Mes événements · Passés »)
const PAST_EVENTS = [
  {
    id: "p-pitch", type: "atelier", title: "Atelier Pitch ton projet",
    org: "CJS Tambacounda", d: 12, m: "Avr", y: 2026,
    attended: true, attestation: true, rated: 5,
  },
  {
    id: "p-web", type: "webinaire", title: "Webinaire : monter son dossier de bourse",
    org: "En ligne", d: 28, m: "Mar", y: 2026,
    attended: true, attestation: true, rated: 0,
  },
  {
    id: "p-forum", type: "forum", title: "Forum emploi de Tambacounda",
    org: "CJS Tambacounda", d: 15, m: "Mar", y: 2026,
    attended: false, attestation: false, rated: 0,
  },
];

// Programme type (atelier CV) — agenda de la journée
const EV_PROGRAMME = [
  { t: "14h00", label: "Accueil & émargement", sub: "Présente ton QR carte CJS à l'entrée" },
  { t: "14h15", label: "Structurer un CV qui se démarque", sub: "Méthode + exemples concrets" },
  { t: "15h30", label: "Pause thé", sub: "" },
  { t: "15h45", label: "Relecture personnalisée", sub: "1-à-1 avec un conseiller" },
  { t: "16h45", label: "Échanges & clôture", sub: "Prochaines étapes et opportunités" },
];

const EV_SPEAKERS = [
  { initials: "SF", name: "Sokhna Fall", role: "Conseillère emploi · CJS Tambacounda" },
  { initials: "MB", name: "Modou Ba", role: "Responsable RH · entreprise partenaire" },
];

Object.assign(window, { EV_TONES, EV_MODE, EVENTS, PAST_EVENTS, EV_PROGRAMME, EV_SPEAKERS });
