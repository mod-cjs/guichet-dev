/**
 * Seed démo notifications — GUIC-247.
 *
 * Crée ~10 notifications réalistes (contexte Sénégal) pour le premier
 * bénéficiaire de la base, afin de tester l'UX du centre de notifications.
 * Idempotent : ne réinsère pas si le user a déjà ≥ 8 notifs.
 */

import type { PrismaClient, TypeNotification } from '@prisma/client'

interface NotifSeed {
  type: TypeNotification
  titre: string
  contenu: string
  iconName: string | null
  metaPill: string | null
  lien: string | null
  /** Décalage en minutes par rapport à `now`. */
  ageMinutes: number
  lu: boolean
}

const SEED: NotifSeed[] = [
  {
    type: 'Deadline',
    titre: 'Plus que 3 jours · Bourse agricole',
    contenu: 'Ton dossier est à 60 %. Il manque 2 documents avant clôture.',
    iconName: 'flame',
    metaPill: 'J-3',
    lien: '/jeune/opportunites',
    ageMinutes: 12,
    lu: false,
  },
  {
    type: 'Message',
    titre: 'Entretien confirmé · Cabinet Karim&Co',
    contenu: "Jeudi 28 mai · 14h00 · Visio Zoom. Yaye t'a préparé un brief.",
    iconName: 'calendar',
    metaPill: 'RDV',
    lien: null,
    ageMinutes: 60,
    lu: false,
  },
  {
    type: 'Yaye',
    titre: 'Yaye a trouvé 2 nouvelles offres pour toi',
    contenu: 'Stage agronomie · 180 000 F · Tambacounda. À valider avant de postuler.',
    iconName: 'sparkle',
    metaPill: 'YAYE',
    lien: '/jeune/yaye',
    ageMinutes: 120,
    lu: false,
  },
  {
    type: 'Candidature',
    titre: 'Bourse mobilité UCAD — Acceptée',
    contenu: 'Réponse positive du jury. Confirme avant le 1er juin.',
    iconName: 'check-circle',
    metaPill: 'DÉCISION',
    lien: '/jeune/candidatures',
    ageMinutes: 60 * 22, // hier
    lu: true,
  },
  {
    type: 'Message',
    titre: 'Mariama, conseillère CJS Tamba',
    contenu: '« Awa, je peux te recevoir vendredi 10h pour ton dossier… »',
    iconName: 'chat',
    metaPill: 'MESSAGE',
    lien: null,
    ageMinutes: 60 * 24, // hier
    lu: true,
  },
  {
    type: 'System',
    titre: 'Atelier CV à Tambacounda · samedi 10h',
    contenu: "5 places restantes. Le centre CJS Tamba t'invite.",
    iconName: 'target',
    metaPill: 'ATELIER',
    lien: '/jeune/agenda',
    ageMinutes: 60 * 30, // hier
    lu: true,
  },
  {
    type: 'Candidature',
    titre: 'Stage Data Sonatel · candidature reçue',
    contenu: 'Sonatel a bien reçu ton dossier. Réponse sous 14 jours ouvrés.',
    iconName: 'document',
    metaPill: 'CANDIDATURE',
    lien: '/jeune/candidatures',
    ageMinutes: 60 * 24 * 3, // cette semaine
    lu: true,
  },
  {
    type: 'System',
    titre: 'Profil complet à 72 %',
    contenu: "Ajoute ton CV pour débloquer 3× plus d'opportunités.",
    iconName: 'info',
    metaPill: 'PROFIL',
    lien: '/jeune/profil',
    ageMinutes: 60 * 24 * 4, // cette semaine
    lu: true,
  },
  {
    type: 'Deadline',
    titre: 'Concours OFNAC clôture demain',
    contenu: 'Inscription en ligne avant minuit. Pièces requises : CNI, CV, lettre.',
    iconName: 'flame',
    metaPill: 'J-1',
    lien: '/jeune/opportunites',
    ageMinutes: 60 * 24 * 5, // cette semaine
    lu: true,
  },
  {
    type: 'Yaye',
    titre: 'Yaye t’a préparé un plan d’action',
    contenu: '3 étapes pour décrocher ton stage en agro-écologie à Kaolack.',
    iconName: 'sparkle',
    metaPill: 'YAYE',
    lien: '/jeune/yaye',
    ageMinutes: 60 * 24 * 12, // plus ancien
    lu: true,
  },
]

export async function seedNotifications(prisma: PrismaClient): Promise<number> {
  // Cherche le premier bénéficiaire actif — usage seed dev uniquement.
  const user = await prisma.utilisateur.findFirst({
    where: { statut: 'actif' },
    orderBy: { createdAt: 'asc' },
    select: { cjsUid: true },
  })
  if (!user) {
    console.log('[seed:notifications] aucun utilisateur — seed sauté.')
    return 0
  }

  const existing = await prisma.notification.count({
    where: { cjsUid: user.cjsUid },
  })
  if (existing >= SEED.length - 2) {
    console.log(`[seed:notifications] ${existing} notifs déjà présentes pour ${user.cjsUid} — seed sauté (idempotent).`)
    return 0
  }

  const now = Date.now()
  let inserted = 0
  for (const n of SEED) {
    const createdAt = new Date(now - n.ageMinutes * 60 * 1000)
    await prisma.notification.create({
      data: {
        cjsUid: user.cjsUid,
        type: n.type,
        titre: n.titre,
        contenu: n.contenu,
        iconName: n.iconName,
        lien: n.lien,
        metaPill: n.metaPill,
        luA: n.lu ? new Date(createdAt.getTime() + 60 * 1000) : null,
        createdAt,
      },
    })
    inserted++
  }
  return inserted
}
