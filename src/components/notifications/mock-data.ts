/**
 * Données mock notifications — refonte v2 (GUIC-198).
 *
 * À remplacer par l'API `/api/v1/notifications` quand le module est branché.
 */
export type NotificationCategory = 'candidature' | 'systeme' | 'opportunite' | 'centre'

export interface MockNotification {
  id: string
  category: NotificationCategory
  title: string
  body: string
  /** ISO 8601. */
  createdAt: string
  read: boolean
}

// Ancré à MIDI du jour courant : les offsets en minutes/heures restent dans le
// groupe « Aujourd'hui » quelle que soit l'heure d'exécution (anti-flaky minuit).
const now = new Date(new Date().setHours(12, 0, 0, 0))
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString()
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 3600_000).toISOString()

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: 'n1',
    category: 'candidature',
    title: 'Candidature retenue',
    body: 'Ton dossier pour le stage agroécologie à Tambacounda passe en entretien.',
    createdAt: minutesAgo(12),
    read: false,
  },
  {
    id: 'n2',
    category: 'opportunite',
    title: 'Nouvelle opportunité 92% match',
    body: 'Bourse mobilité YEAH — clôture dans 6 jours.',
    createdAt: minutesAgo(45),
    read: false,
  },
  {
    id: 'n3',
    category: 'systeme',
    title: 'Profil vérifié',
    body: 'Ton identité a été confirmée par le centre CJS Dakar.',
    createdAt: minutesAgo(180),
    read: false,
  },
  {
    id: 'n4',
    category: 'centre',
    title: 'Rappel rendez-vous',
    body: 'Atelier CV demain 10h00 — Centre CJS Pikine.',
    createdAt: daysAgo(1),
    read: true,
  },
  {
    id: 'n5',
    category: 'candidature',
    title: 'Recruteur a vu ton CV',
    body: 'Sococim Industries a consulté ta candidature.',
    createdAt: daysAgo(1),
    read: true,
  },
  {
    id: 'n6',
    category: 'opportunite',
    title: 'Yaye te suggère 3 offres',
    body: 'Sélection hebdo selon ton profil.',
    createdAt: daysAgo(2),
    read: true,
  },
  {
    id: 'n7',
    category: 'systeme',
    title: 'Mise à jour CDP',
    body: 'Tes préférences de confidentialité ont été enregistrées.',
    createdAt: daysAgo(4),
    read: true,
  },
  {
    id: 'n8',
    category: 'centre',
    title: 'Nouvel atelier ouvert',
    body: 'Initiation à Excel — Centre CJS Saint-Louis, 15 inscrits.',
    createdAt: daysAgo(6),
    read: true,
  },
]
