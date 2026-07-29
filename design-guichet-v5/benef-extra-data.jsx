/* eslint-disable */
// Lot 12 — Compléments bénéficiaire & Auth · données partagées (web + mobile).
// Bénéficiaire : Awa Diop.

// Messagerie bénéficiaire ↔ conseiller / recruteurs
const B_THREADS = [
  { id: "bt1", who: "Cheikh Ndiaye", role: "Conseiller · CJS Tambacounda", init: "CN", tone: "blue", last: "On se voit jeudi à 9h pour le CV ?", time: "09:38", unread: 1, online: true,
    msgs: [
      { me: false, t: "Bonjour Awa, j'ai regardé ton profil. Très bien parti !", time: "09:20" },
      { me: false, t: "On se voit jeudi à 9h pour revoir ton CV ensemble ?", time: "09:38" },
    ]},
  { id: "bt2", who: "Sonatel — Recrutement", role: "Stage Data Science", init: "S", tone: "stage", last: "Vous : Merci, je serai disponible le 11.", time: "Hier", unread: 0, online: false,
    msgs: [
      { me: false, t: "Bonjour, votre candidature nous intéresse. Entretien le 11 juin à 10h ?", time: "Hier" },
      { me: true, t: "Merci, je serai disponible le 11.", time: "Hier" },
    ]},
  { id: "bt3", who: "Yaye — Assistante", role: "Assistante IA du Guichet", init: "Y", tone: "green", last: "J'ai trouvé 3 bourses qui te correspondent.", time: "Lun", unread: 0, online: true, ai: true,
    msgs: [{ me: false, t: "J'ai trouvé 3 bourses qui te correspondent. Veux-tu les voir ?", time: "Lun" }] },
  { id: "bt4", who: "GIE Diaobé", role: "Stage agronomie", init: "G", tone: "stage", last: "Pouvez-vous nous rappeler ?", time: "28 mai", unread: 0, online: false,
    msgs: [{ me: false, t: "Pouvez-vous nous rappeler au sujet du stage ?", time: "28 mai" }] },
];

// Opportunités / ressources sauvegardées
const B_SAVED = [
  { id: "s1", kind: "emploi", type: "Emploi", title: "Développeur Web Junior · CDI", org: "Wave Mobile Money", meta: "Dakar · dès 500 000 F", deadline: "Clôture J-12", icon: "i-employment", tone: "emploi" },
  { id: "s2", kind: "bourse", type: "Bourse", title: "Bourse mobilité numérique · Master 2", org: "Min. Enseignement Supérieur", meta: "International · frais + 80 000 F", deadline: "Clôture le 30 juin", icon: "i-funding", tone: "financement" },
  { id: "s3", kind: "event", type: "Événement", title: "Forum régional de l'emploi", org: "ANPEJ · Diamniadio", meta: "28 mai · présentiel", deadline: "Gratuit", icon: "i-calendar", tone: "evenement" },
  { id: "s4", kind: "res", type: "Ressource", title: "Le guide complet du CV gagnant", org: "Médiathèque CJS", meta: "PDF · 24 pages", deadline: "Audio Wolof", icon: "i-document", tone: "green" },
  { id: "s5", kind: "format", type: "Formation", title: "Bootcamp Data Analyse · 8 semaines", org: "CJS Dakar × Sonatel Academy", meta: "Dakar · gratuit", deadline: "Sélection sur dossier", icon: "i-learning", tone: "formation" },
];

// Notifications
const B_NOTIFS = [
  { id: "n1", icon: "i-calendar", tone: "yellow", title: "Entretien confirmé", body: "Sonatel · Stage Data Science — mardi 11 juin à 10h00.", time: "il y a 1 h", unread: true },
  { id: "n2", icon: "i-check-circle", tone: "green", title: "Réservation acceptée", body: "Salle de réunion A · CJS Tambacounda — vendredi 23 mai.", time: "il y a 3 h", unread: true },
  { id: "n3", icon: "i-employment", tone: "blue", title: "Nouvelle opportunité pour toi", body: "Yaye a trouvé « Analyste BI · CDD » qui correspond à ton profil.", time: "hier", unread: false },
  { id: "n4", icon: "i-chat", tone: "teal", title: "Message de Cheikh Ndiaye", body: "On se voit jeudi à 9h pour revoir ton CV ?", time: "hier", unread: false },
  { id: "n5", icon: "i-funding", tone: "yellow", title: "Bourse bientôt clôturée", body: "Bourse mobilité numérique — plus que 5 jours pour candidater.", time: "il y a 2 j", unread: false },
];

const B_NOTIF_PREFS = [
  { icon: "i-bell", label: "Notifications push", sub: "Sur ton téléphone", on: true },
  { icon: "i-employment", label: "Nouvelles opportunités", sub: "Quand Yaye trouve une offre pour toi", on: true },
  { icon: "i-calendar", label: "Rappels d'entretien & RDV", sub: "24 h et 1 h avant", on: true },
  { icon: "i-chat", label: "Messages", sub: "Conseillers et recruteurs", on: true },
  { icon: "i-mail", label: "E-mails récapitulatifs", sub: "Résumé hebdomadaire", on: false },
];

const TONE_MAP = {
  // Clés de catégorie officielles (retour design V3) — à utiliser dès qu'il
  // s'agit d'un TYPE d'offre ; les clés de couleur brutes restent pour le reste.
  emploi:      ["var(--cat-emploi-soft)", "var(--cat-emploi-ink)"],
  stage:       ["var(--cat-stage-soft)", "var(--cat-stage-ink)"],
  formation:   ["var(--cat-formation-soft)", "var(--cat-formation-ink)"],
  financement: ["var(--cat-financement-soft)", "var(--cat-financement-ink)"],
  volontariat: ["var(--cat-volontariat-soft)", "var(--cat-volontariat-ink)"],
  evenement:   ["var(--cat-evenement-soft)", "var(--cat-evenement-ink)"],
  neutre:      ["var(--cat-neutre-soft)", "var(--cat-neutre-ink)"],
  blue: ["var(--gj-blue-soft)", "var(--gj-blue-ink)"],
  teal: ["var(--gj-teal-soft)", "var(--gj-teal-deep)"],
  green: ["var(--gj-green-soft)", "var(--gj-green-ink)"],
  yellow: ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"],
};

Object.assign(window, { B_THREADS, B_SAVED, B_NOTIFS, B_NOTIF_PREFS, TONE_MAP });
