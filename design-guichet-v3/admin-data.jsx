/* eslint-disable */
// Lot 11 — Administration · données partagées (web + mobile).
// Super-admin national CJS : Mme Khady Ndiaye · Coordination nationale.

const ADMIN = { name: "Khady Ndiaye", role: "Coordination nationale", org: "Guichet Jeunesse Sénégal", initials: "KN" };

// KPIs nationaux
const ADM_KPIS = [
  { label: "Jeunes inscrits", value: "48 720", delta: "+1 240 / mois", up: true, icon: "i-users", tone: "teal", spark: [30, 34, 38, 41, 44, 46, 48] },
  { label: "Centres actifs", value: "14", delta: "2 en ouverture", up: true, icon: "i-pin", tone: "blue", spark: [10, 11, 11, 12, 13, 13, 14] },
  { label: "Insertions (mois)", value: "1 086", delta: "+12% vs avril", up: true, icon: "i-employment", tone: "green", spark: [620, 700, 760, 840, 910, 980, 1086] },
  { label: "À modérer", value: "23", delta: "offres + événements", up: false, icon: "i-shield", tone: "yellow", urgent: true, spark: [12, 18, 15, 21, 19, 25, 23] },
];

// Performance par centre (+ coords carte, repris du Lot 7)
const ADM_CENTRES = [
  { id: "dakar", name: "Dakar Plateau", region: "Dakar", jeunes: 12840, insertions: 312, taux: 71, agents: 6, x: 24, y: 84 },
  { id: "thies", name: "Thiès", region: "Thiès", jeunes: 6210, insertions: 142, taux: 64, agents: 4, x: 50, y: 82 },
  { id: "tamba", name: "Tambacounda", region: "Tambacounda", jeunes: 1284, insertions: 38, taux: 58, agents: 3, x: 180, y: 120 },
  { id: "stlouis", name: "Saint-Louis", region: "Saint-Louis", jeunes: 4980, insertions: 119, taux: 67, agents: 3, x: 52, y: 34 },
  { id: "ziguinchor", name: "Ziguinchor", region: "Ziguinchor", jeunes: 3870, insertions: 88, taux: 61, agents: 4, x: 60, y: 176 },
  { id: "kaolack", name: "Kaolack", region: "Kaolack", jeunes: 5120, insertions: 96, taux: 55, agents: 3, x: 75, y: 118 },
  { id: "kolda", name: "Kolda", region: "Kolda", jeunes: 2240, insertions: 41, taux: 49, agents: 2, x: 120, y: 165 },
  { id: "kedougou", name: "Kédougou", region: "Kédougou", jeunes: 980, insertions: 22, taux: 52, agents: 2, x: 228, y: 176 },
];

// Répartition des utilisateurs (donut)
const ADM_USERS_SPLIT = [
  { label: "Bénéficiaires", value: 48720, color: "var(--gj-teal)" },
  { label: "Conseillers", value: 58, color: "var(--gj-blue)" },
  { label: "Recruteurs", value: 412, color: "var(--gj-yellow-deep)" },
  { label: "Admins", value: 9, color: "var(--gj-grey)" },
];

// Liste utilisateurs (gestion)
const ADM_USERS = [
  { id: "u1", name: "Awa Diop", init: "AD", role: "Bénéficiaire", centre: "Tambacounda", statut: "Actif", last: "Aujourd'hui" },
  { id: "u2", name: "Cheikh Ndiaye", init: "CN", role: "Conseiller", centre: "Tambacounda", statut: "Actif", last: "Il y a 1 h" },
  { id: "u3", name: "Aïda Mbaye", init: "AM", role: "Recruteur", centre: "Sonatel", statut: "Actif", last: "Hier" },
  { id: "u4", name: "Modou Sarr", init: "MS", role: "Bénéficiaire", centre: "Koussanar", statut: "Actif", last: "Hier" },
  { id: "u5", name: "Fatou Sy", init: "FS", role: "Conseillère", centre: "Dakar Plateau", statut: "Actif", last: "Il y a 3 j" },
  { id: "u6", name: "Wave Mobile Money", init: "W", role: "Recruteur", centre: "—", statut: "À vérifier", last: "Il y a 2 j" },
];

const ROLE_TONE = {
  "Bénéficiaire": { soft: "var(--gj-teal-soft)", ink: "var(--gj-teal-deep)" },
  "Conseiller": { soft: "var(--gj-blue-soft)", ink: "var(--gj-blue-ink)" },
  "Conseillère": { soft: "var(--gj-blue-soft)", ink: "var(--gj-blue-ink)" },
  "Recruteur": { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)" },
  "Admin": { soft: "var(--gj-bg)", ink: "var(--gj-grey)" },
};

// File de modération (offres & événements)
const ADM_MODERATION = [
  { id: "m1", kind: "Offre", title: "Data Analyst · alternance 12 mois", by: "Sonatel", centre: "Dakar", date: "il y a 2 h", flag: false },
  { id: "m2", kind: "Événement", title: "Forum emploi local de Tambacounda", by: "CJS Tambacounda", centre: "Tambacounda", date: "il y a 5 h", flag: false },
  { id: "m3", kind: "Offre", title: "Commercial terrain · commission uniquement", by: "DistribPlus SARL", centre: "Thiès", date: "hier", flag: true, reason: "Rémunération à la commission seule — à vérifier",
    ai: { verdict: "reject", score: 38, summary: "Signaux à risque détectés.", checks: [["Rémunération conforme", false], ["Annonceur vérifié", false], ["Description complète", true], ["Aucun terme prohibé", true]], reason: "Rémunération 100% commission + annonceur non vérifié → risque d'arnaque." } },
  { id: "m4", kind: "Formation", title: "Initiation maraîchage moderne", by: "CJS Tambacounda", centre: "Tambacounda", date: "hier", flag: false,
    ai: { verdict: "approve", score: 95, summary: "Conforme. Publication recommandée.", checks: [["Rémunération conforme", true], ["Annonceur vérifié", true], ["Description complète", true], ["Aucun terme prohibé", true]] } },
];

// Analyse IA (Yaye) pré-modération — par item
const AI_MOD = {
  m1: { verdict: "approve", score: 92, summary: "Offre conforme, annonceur vérifié. Publication recommandée.", checks: [["Rémunération conforme", true], ["Annonceur vérifié", true], ["Description complète", true], ["Aucun terme prohibé", true]] },
  m2: { verdict: "approve", score: 88, summary: "Événement cohérent avec la mission CJS.", checks: [["Lieu & date valides", true], ["Organisateur vérifié", true], ["Public éligible", true], ["Aucun terme prohibé", true]] },
  m3: { verdict: "reject", score: 38, summary: "Signaux à risque — vérification humaine requise.", checks: [["Rémunération conforme", false], ["Annonceur vérifié", false], ["Description complète", true], ["Aucun terme prohibé", true]], reason: "Rémunération 100% commission + annonceur non vérifié → risque d'arnaque." },
  m4: { verdict: "approve", score: 95, summary: "Conforme. Publication recommandée.", checks: [["Rémunération conforme", true], ["Annonceur vérifié", true], ["Description complète", true], ["Aucun terme prohibé", true]] },
};
const AI_VERDICT = {
  approve: { soft: "var(--gj-green-soft)", ink: "var(--gj-green-ink)", dot: "var(--gj-green)", label: "Conforme · à approuver" },
  review:  { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)", dot: "var(--gj-yellow-deep)", label: "À vérifier" },
  reject:  { soft: "var(--gj-red-soft)", ink: "var(--gj-red-ink)", dot: "var(--gj-red)", label: "Risque · à rejeter" },
};

// =====================================================================
// Types d'opportunité — CRUD (gérés par l'admin, pilotent les formulaires de publication)
// =====================================================================
const OPP_TYPES = [
  { id: "emploi",   label: "Emploi",              icon: "i-employment", tone: "blue",   active: true,  moderation: "IA + humaine", count: 428, fields: ["Contrat", "Salaire", "Lieu", "Clôture"] },
  { id: "stage",    label: "Stage",               icon: "i-employment", tone: "teal",   active: true,  moderation: "IA + humaine", count: 142, fields: ["Durée", "Indemnité", "Lieu", "Clôture"] },
  { id: "bourse",   label: "Bourse & financement",icon: "i-funding",    tone: "yellow", active: true,  moderation: "Humaine",      count: 94,  fields: ["Montant", "Niveau", "Clôture"] },
  { id: "formation",label: "Formation",           icon: "i-learning",   tone: "green",  active: true,  moderation: "IA",           count: 143, fields: ["Durée", "Modalité", "Places"] },
  { id: "concours", label: "Concours & appel à projets", icon: "i-trending", tone: "teal", active: true, moderation: "Humaine",    count: 67,  fields: ["Dotation", "Thème", "Clôture"] },
  { id: "event",    label: "Événement / atelier", icon: "i-calendar",   tone: "blue",   active: true,  moderation: "IA",           count: 38,  fields: ["Date", "Lieu", "Places", "Mode"] },
  { id: "volontariat", label: "Volontariat",      icon: "i-engagement", tone: "green",  active: false, moderation: "IA",           count: 52,  fields: ["Durée", "Cause", "Lieu"] },
];
const TYPE_TONE = {
  blue: { soft: "var(--gj-blue-soft)", ink: "var(--gj-blue-ink)" },
  teal: { soft: "var(--gj-teal-soft)", ink: "var(--gj-teal-deep)" },
  yellow: { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)" },
  green: { soft: "var(--gj-green-soft)", ink: "var(--gj-green-ink)" },
};

// Validation des partenaires/recruteurs
const ADM_PARTNERS = [
  { id: "p1", name: "Sonatel", init: "S", secteur: "Télécoms", offres: 12, statut: "Vérifié", date: "Partenaire depuis 2024" },
  { id: "p2", name: "Wave Mobile Money", init: "W", secteur: "Fintech", offres: 0, statut: "À vérifier", date: "Demande du 6 juin", ninea: "NINEA 0079..." },
  { id: "p3", name: "GIE Diaobé", init: "G", secteur: "Agriculture", offres: 3, statut: "Vérifié", date: "Partenaire depuis 2025" },
  { id: "p4", name: "DistribPlus SARL", init: "D", secteur: "Distribution", offres: 1, statut: "Suspendu", date: "Signalé · pratique douteuse" },
];

const PARTNER_STATUS = {
  "Vérifié": { soft: "var(--gj-green-soft)", ink: "var(--gj-green-ink)", icon: "i-check-circle" },
  "À vérifier": { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)", icon: "i-clock" },
  "Suspendu": { soft: "var(--gj-red-soft)", ink: "var(--gj-red-ink)", icon: "i-block" },
};

// Journal d'audit
const ADM_AUDIT = [
  { who: "Cheikh Ndiaye", init: "CN", action: "a validé la réservation de Awa Diop (Salle A)", time: "09:42", tone: "teal" },
  { who: "Système", init: "★", action: "a publié l'offre « Stage Data Science » après modération", time: "09:10", tone: "grey" },
  { who: "Aïda Mbaye", init: "AM", action: "a planifié un entretien avec Awa Diop", time: "08:55", tone: "yellow" },
  { who: "Khady Ndiaye", init: "KN", action: "a suspendu le partenaire DistribPlus SARL", time: "Hier · 17:30", tone: "red" },
  { who: "Fatou Sy", init: "FS", action: "a créé 2 ateliers au centre de Dakar Plateau", time: "Hier · 15:12", tone: "blue" },
];

// Contenu (ressources médiathèque) à gérer
const ADM_CONTENT = [
  { id: "ct1", title: "Le guide complet du CV gagnant", cat: "Emploi", dl: "3 240", statut: "Publié" },
  { id: "ct2", title: "Modèle de business plan simplifié", cat: "Entrepreneuriat", dl: "2 110", statut: "Publié" },
  { id: "ct3", title: "Bien remplir son dossier de bourse", cat: "Démarches", dl: "980", statut: "Publié" },
  { id: "ct4", title: "Guide TVA pour micro-entreprises", cat: "Entrepreneuriat", dl: "—", statut: "Brouillon" },
];

// Rôles & droits (paramètres)
const ADM_ROLES = [
  { role: "Bénéficiaire", n: "48 720", perms: ["Postuler", "Réserver", "Messagerie"] },
  { role: "Conseiller", n: "58", perms: ["Valider réservations", "Gérer bénéficiaires", "Check-in", "Publier ateliers"] },
  { role: "Recruteur", n: "412", perms: ["Publier offres", "Gérer candidatures", "Entretiens"] },
  { role: "Admin régional", n: "8", perms: ["Modération", "Gérer centres", "Rapports"] },
  { role: "Super-admin", n: "1", perms: ["Accès total", "Rôles & droits", "Audit"] },
];

// Indicateurs secondaires (bandeau de chips)
const ADM_KPIS2 = [
  { label: "Taux d'insertion moyen", value: "61%", icon: "i-trending", up: true },
  { label: "Candidatures (mois)", value: "4 312", icon: "i-document", up: true },
  { label: "Ateliers tenus", value: "186", icon: "i-calendar", up: true },
  { label: "Partenaires actifs", value: "412", icon: "i-employment", up: true },
  { label: "Délai de réponse moyen", value: "1,8 j", icon: "i-clock", up: false },
  { label: "Satisfaction jeunes", value: "4,6/5", icon: "i-heart", up: true },
];

// série mensuelle insertions (bar chart)
const ADM_MONTHLY = [
  { m: "Déc", v: 720 }, { m: "Jan", v: 810 }, { m: "Fév", v: 760 }, { m: "Mar", v: 900 }, { m: "Avr", v: 970 }, { m: "Mai", v: 1086 },
];
// inscriptions cumulées (line)
const ADM_GROWTH = [30000, 34000, 38500, 41200, 44800, 46900, 48720];

Object.assign(window, { ADMIN, ADM_KPIS, ADM_KPIS2, ADM_CENTRES, ADM_USERS_SPLIT, ADM_USERS, ROLE_TONE, ADM_MODERATION, AI_MOD, AI_VERDICT, OPP_TYPES, TYPE_TONE, ADM_PARTNERS, PARTNER_STATUS, ADM_AUDIT, ADM_CONTENT, ADM_ROLES, ADM_MONTHLY, ADM_GROWTH });
