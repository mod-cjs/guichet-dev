/* eslint-disable */
// Lot 8 — Espace Conseiller (agent CJS) · données partagées (web + mobile).
// Agent : Cheikh Ndiaye · conseiller emploi · CJS Tambacounda.

const AGENT = { name: "Cheikh Ndiaye", role: "Conseiller emploi", centre: "CJS Tambacounda", initials: "CN" };

// Réutilise les tons de ressource (salle / véhicule / poste) cohérents avec le Lot 7.
const A_RES_KIND = {
  salle:    { icon: "i-users",   soft: "var(--gj-teal-soft)",   ink: "var(--gj-teal-deep)", label: "Salle" },
  vehicule: { icon: "i-car",     soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)",label: "Véhicule" },
  poste:    { icon: "i-desktop", soft: "var(--gj-blue-soft)",   ink: "var(--gj-blue-ink)",  label: "Poste info" },
};

const A_STATUS = {
  attente:  { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)", dot: "var(--gj-yellow-deep)", label: "En attente", icon: "i-clock" },
  acceptee: { soft: "var(--gj-green-soft)",  ink: "var(--gj-green-ink)",  dot: "var(--gj-green)",       label: "Acceptée",  icon: "i-check-circle" },
  refusee:  { soft: "var(--gj-red-soft)",    ink: "var(--gj-red-ink)",    dot: "var(--gj-red)",         label: "Refusée",   icon: "i-block" },
};

// File de réservations à traiter / traitées
const A_RESA = [
  { id: "q1", kind: "salle", res: "Salle de réunion A", who: "Awa Diop", init: "AD", age: 22,
    date: "Ven 23 mai", slot: "14h00 – 16h00", people: 8, motif: "Réunion d'équipe — projet maraîchage",
    status: "attente", asked: "il y a 2 h", justif: false },
  { id: "q2", kind: "vehicule", res: "Véhicule de service (pick-up)", who: "Modou Sarr", init: "MS", age: 25,
    date: "Mar 27 mai", slot: "08h00 – 13h00", people: 3, motif: "Visite terrain à Goudiry — suivi coopérative",
    status: "attente", asked: "il y a 5 h", justif: true },
  { id: "q3", kind: "poste", res: "Poste informatique #3", who: "Fatou Ba", init: "FB", age: 19,
    date: "Lun 19 mai", slot: "10h00 – 11h00", people: 1, motif: "Dépôt dossier de bourse en ligne",
    status: "attente", asked: "hier", justif: false },
  { id: "q4", kind: "salle", res: "Salle d'atelier", who: "Ibrahima Diallo", init: "ID", age: 24,
    date: "Jeu 29 mai", slot: "09h00 – 12h00", people: 15, motif: "Atelier pitch entre pairs",
    status: "attente", asked: "hier", justif: false },
  { id: "q5", kind: "salle", res: "Salle de réunion A", who: "Aïssatou Sow", init: "AS", age: 21,
    date: "Mer 14 mai", slot: "15h00 – 17h00", people: 6, motif: "Préparation concours entrepreneuriat",
    status: "acceptee", asked: "le 12 mai", justif: false },
  { id: "q6", kind: "vehicule", res: "Véhicule de service", who: "Ousmane Faye", init: "OF", age: 26,
    date: "Mar 13 mai", slot: "07h00 – 18h00", people: 4, motif: "Déplacement hors région (Kédougou)",
    status: "refusee", asked: "le 10 mai", justif: true, note: "Véhicule déjà réservé — créneau proposé : 20 mai" },
];

// Annuaire bénéficiaires du centre
const A_BENEF = [
  { id: "b1", name: "Awa Diop", init: "AD", age: 22, sex: "F", commune: "Tambacounda", niveau: "Bac+2", profil: 72,
    objectif: "Micro-entreprise maraîchage", statut: "Actif", cand: 3, last: "Aujourd'hui", tel: "+221 77 123 45 67", since: "Mars 2024" },
  { id: "b2", name: "Modou Sarr", init: "MS", age: 25, sex: "H", commune: "Koussanar", niveau: "Bac+3", profil: 90,
    objectif: "Emploi en agronomie", statut: "Actif", cand: 7, last: "Hier", tel: "+221 76 222 11 09", since: "Janv. 2024" },
  { id: "b3", name: "Fatou Ba", init: "FB", age: 19, sex: "F", commune: "Tambacounda", niveau: "Bac", profil: 45,
    objectif: "Bourse d'étude supérieure", statut: "Profil à compléter", cand: 1, last: "il y a 3 j", tel: "+221 70 988 44 12", since: "Avr. 2026" },
  { id: "b4", name: "Ibrahima Diallo", init: "ID", age: 24, sex: "H", commune: "Bakel", niveau: "Bac+2", profil: 64,
    objectif: "Formation développement web", statut: "Actif", cand: 4, last: "il y a 5 j", tel: "+221 77 654 00 21", since: "Fév. 2025" },
  { id: "b5", name: "Aïssatou Sow", init: "AS", age: 21, sex: "F", commune: "Tambacounda", niveau: "Bac+1", profil: 58,
    objectif: "Concours entrepreneuriat", statut: "Actif", cand: 2, last: "il y a 1 sem.", tel: "+221 78 345 67 89", since: "Sept. 2025" },
  { id: "b6", name: "Ousmane Faye", init: "OF", age: 26, sex: "H", commune: "Goudiry", niveau: "Bac+4", profil: 81,
    objectif: "Création coopérative", statut: "Actif", cand: 9, last: "il y a 2 sem.", tel: "+221 77 111 22 33", since: "Nov. 2023" },
];

// RDV / agenda du jour
const A_RDV = [
  { id: "r1", time: "09:00", dur: "30 min", who: "Awa Diop", init: "AD", type: "Conseil 1-à-1", topic: "Revue de CV", mode: "Présentiel", status: "confirmé" },
  { id: "r2", time: "10:00", dur: "45 min", who: "Fatou Ba", init: "FB", type: "Orientation", topic: "Choix de filière", mode: "Présentiel", status: "confirmé" },
  { id: "r3", time: "11:30", dur: "30 min", who: "Ibrahima Diallo", init: "ID", type: "Suivi candidature", topic: "Stage dév. web", mode: "Téléphone", status: "à confirmer" },
  { id: "r4", time: "14:00", dur: "2 h", who: "Atelier collectif", init: "★", type: "Atelier CV", topic: "12 inscrits · Salle A", mode: "Présentiel", status: "atelier" },
  { id: "r5", time: "16:30", dur: "30 min", who: "Modou Sarr", init: "MS", type: "Conseil 1-à-1", topic: "Préparation entretien", mode: "Présentiel", status: "confirmé" },
];

// Messagerie — conversations
const A_THREADS = [
  { id: "t1", who: "Awa Diop", init: "AD", last: "Merci beaucoup pour la relecture !", time: "09:42", unread: 0, online: true,
    msgs: [
      { me: false, t: "Bonjour M. Ndiaye, j'ai mis à jour mon CV comme convenu.", time: "09:30" },
      { me: false, t: "Est-ce que vous pouvez y jeter un œil avant que je postule chez Sonatel ?", time: "09:31" },
      { me: true, t: "Bonjour Awa, bien reçu. Je regarde ça ce matin et je te fais un retour avant midi.", time: "09:38" },
      { me: false, t: "Merci beaucoup pour la relecture !", time: "09:42" },
    ]},
  { id: "t2", who: "Fatou Ba", init: "FB", last: "D'accord, je viens demain à 10h.", time: "Hier", unread: 2, online: false,
    msgs: [{ me: false, t: "D'accord, je viens demain à 10h.", time: "Hier" }] },
  { id: "t3", who: "Modou Sarr", init: "MS", last: "Vous : Ta demande de véhicule est en cours.", time: "Hier", unread: 0, online: false,
    msgs: [{ me: true, t: "Ta demande de véhicule est en cours de validation.", time: "Hier" }] },
  { id: "t4", who: "Ibrahima Diallo", init: "ID", last: "Super, j'ai décroché l'entretien 🎉", time: "Lun", unread: 0, online: false,
    msgs: [{ me: false, t: "Super, j'ai décroché l'entretien 🎉", time: "Lun" }] },
];

// Liste de présence (check-in atelier CV)
const A_ATTENDEES = [
  { id: "a1", name: "Awa Diop", init: "AD", commune: "Tambacounda", in: true, at: "13:54" },
  { id: "a2", name: "Aïssatou Sow", init: "AS", commune: "Tambacounda", in: true, at: "13:58" },
  { id: "a3", name: "Ibrahima Diallo", init: "ID", commune: "Bakel", in: true, at: "14:02" },
  { id: "a4", name: "Mariama Cissé", init: "MC", commune: "Tambacounda", in: false, at: null },
  { id: "a5", name: "Cheikh Top", init: "CT", commune: "Koussanar", in: false, at: null },
  { id: "a6", name: "Ndèye Gueye", init: "NG", commune: "Tambacounda", in: true, at: "14:05" },
  { id: "a7", name: "Babacar Sy", init: "BS", commune: "Bakel", in: false, at: null },
  { id: "a8", name: "Khady Diouf", init: "KD", commune: "Tambacounda", in: true, at: "14:08" },
];

// Publications gérées par l'agent (opportunités / événements)
const A_PUBLICATIONS = [
  { id: "p1", kind: "Atelier", title: "Atelier CV & lettre de motivation", date: "22 mai 2026", status: "Publié", appli: 12, cap: 20, tone: "teal" },
  { id: "p2", kind: "Emploi", title: "Animateur communautaire · CDD", date: "Clôture 7 juin", status: "Publié", appli: 8, cap: null, tone: "blue" },
  { id: "p3", kind: "Événement", title: "Forum emploi local de Tambacounda", date: "30 mai 2026", status: "Brouillon", appli: 0, cap: 200, tone: "yellow" },
  { id: "p4", kind: "Formation", title: "Initiation maraîchage moderne", date: "Juin 2026", status: "En relecture", appli: 0, cap: 25, tone: "green" },
];

const PUB_STATUS = {
  "Publié":      { soft: "var(--gj-green-soft)", ink: "var(--gj-green-ink)" },
  "Brouillon":   { soft: "var(--gj-bg)",         ink: "var(--gj-grey)" },
  "En relecture":{ soft: "var(--gj-yellow-soft)",ink: "var(--gj-yellow-ink)" },
};

// Stats du centre (dashboard)
const A_STATS = [
  { label: "Bénéficiaires actifs", value: "1 284", delta: "+38 ce mois", icon: "i-users", tone: "teal" },
  { label: "Réservations à valider", value: "4", delta: "à traiter aujourd'hui", icon: "i-calendar", tone: "yellow", urgent: true },
  { label: "RDV aujourd'hui", value: "5", delta: "2 le matin · 3 l'après-midi", icon: "i-clock", tone: "blue" },
  { label: "Candidatures du mois", value: "143", delta: "+12% vs avril", icon: "i-employment", tone: "green" },
];

Object.assign(window, { AGENT, A_RES_KIND, A_STATUS, A_RESA, A_BENEF, A_RDV, A_THREADS, A_ATTENDEES, A_PUBLICATIONS, PUB_STATUS, A_STATS });
