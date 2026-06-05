import type { Notification } from './types'

/**
 * Mock data pour le drawer notifications mobile (GUIC-194).
 * 14 entrées variées, mix unread/lues, sur plusieurs jours.
 *
 * Les timestamps sont relatifs à `now` calculés au chargement du module
 * pour rester naturels en démo (Aujourd'hui / Hier / Cette semaine).
 */
const now = Date.now()
const hour = 60 * 60 * 1000
const day = 24 * hour

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'deadline',
    titre: 'Bourse YEAH — clôture demain',
    preview: "Ton dossier est complété à 80%. Termine-le avant 23h59 demain.",
    timestamp: new Date(now - 1 * hour).toISOString(),
    unread: true,
  },
  {
    id: 'n2',
    type: 'candidature',
    titre: 'Candidature reçue',
    preview: 'Centre Ndayane a accusé réception de ta candidature stagiaire agro.',
    timestamp: new Date(now - 3 * hour).toISOString(),
    unread: true,
  },
  {
    id: 'n3',
    type: 'yaye',
    titre: 'Yaye a trouvé 3 nouvelles offres',
    preview: 'Match >90% à Tambacounda : 1 stage payé, 2 CDD.',
    timestamp: new Date(now - 5 * hour).toISOString(),
    unread: true,
  },
  {
    id: 'n4',
    type: 'message',
    titre: 'Nouveau message du recruteur',
    preview: 'Aïda Sow : "Peux-tu confirmer ta disponibilité lundi ?"',
    timestamp: new Date(now - 8 * hour).toISOString(),
    unread: false,
  },
  // Hier
  {
    id: 'n5',
    type: 'deadline',
    titre: 'Formation Sénégal Numérique — inscriptions',
    preview: 'Inscriptions ouvertes jusqu’au 12 juin. 240 places.',
    timestamp: new Date(now - 1 * day - 2 * hour).toISOString(),
    unread: true,
  },
  {
    id: 'n6',
    type: 'candidature',
    titre: 'Candidature retenue 🎉',
    preview: 'Ta candidature au programme "Jeunes Leaders Sahel" est shortlistée.',
    timestamp: new Date(now - 1 * day - 5 * hour).toISOString(),
    unread: false,
  },
  {
    id: 'n7',
    type: 'message',
    titre: 'Mentor Yaye disponible',
    preview: 'Cheikh est disponible pour ta question sur le pitch deck.',
    timestamp: new Date(now - 1 * day - 9 * hour).toISOString(),
    unread: false,
  },
  // Cette semaine
  {
    id: 'n8',
    type: 'yaye',
    titre: 'Yaye a complété ton dossier',
    preview: '5 documents ajoutés automatiquement à ta candidature CFP.',
    timestamp: new Date(now - 2 * day - 4 * hour).toISOString(),
    unread: false,
  },
  {
    id: 'n9',
    type: 'deadline',
    titre: 'Atelier CV — demain 14h',
    preview: 'Centre Pikine. Apporte une pièce d’identité et une photo récente.',
    timestamp: new Date(now - 2 * day - 7 * hour).toISOString(),
    unread: false,
  },
  {
    id: 'n10',
    type: 'candidature',
    titre: 'Candidature non retenue',
    preview: 'Programme PNUD Jeunesse : 1 200 dossiers, 80 retenus. Yaye t’en propose 3 similaires.',
    timestamp: new Date(now - 3 * day - 2 * hour).toISOString(),
    unread: false,
  },
  {
    id: 'n11',
    type: 'message',
    titre: 'Communauté CJS',
    preview: 'Awa Diallo a réagi à ton témoignage "Mon premier stage".',
    timestamp: new Date(now - 3 * day - 8 * hour).toISOString(),
    unread: false,
  },
  {
    id: 'n12',
    type: 'yaye',
    titre: 'Yaye — récap hebdomadaire',
    preview: '4 candidatures, 12 opportunités vues, 1 retenue. Bravo.',
    timestamp: new Date(now - 4 * day - 3 * hour).toISOString(),
    unread: false,
  },
  {
    id: 'n13',
    type: 'deadline',
    titre: 'Visite médicale pré-embauche',
    preview: 'À planifier avant ton entrée en stage le 15 juin.',
    timestamp: new Date(now - 5 * day - 1 * hour).toISOString(),
    unread: false,
  },
  {
    id: 'n14',
    type: 'message',
    titre: 'Rappel mentor',
    preview: 'N’oublie pas ton rendez-vous avec Mariama jeudi à 16h.',
    timestamp: new Date(now - 6 * day - 5 * hour).toISOString(),
    unread: false,
  },
]
