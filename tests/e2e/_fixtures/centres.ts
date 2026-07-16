/**
 * GUIC-394 — Fixtures Playwright pour les flows centres (réservation + check-in).
 *
 * Helpers de seed/teardown Prisma pour créer un centre + ressource (+ réservation
 * optionnelle) jetable propre à chaque test E2E. Utilise `prisma` directement —
 * les tests E2E qui en dépendent doivent être exécutés contre une DB de dev / test
 * isolée (jamais prod).
 *
 * Convention : tous les ids sont préfixés `e2e-` pour faciliter le nettoyage si
 * un test plante avant `cleanup`.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

let _prisma: PrismaClient | null = null

/**
 * GUIC-604 — Prisma 7 exige un ADAPTATEUR : `new PrismaClient()` nu lève
 * « PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions ».
 * On monte donc le client comme l'application (cf. src/lib/prisma.ts). Jamais vu jusqu'ici :
 * ces tests étaient skippés depuis leur création, donc cette fixture n'avait jamais tourné.
 */
function getPrisma(): PrismaClient {
  if (!_prisma) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL manquante (fixtures E2E centres)')
    _prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) })
  }
  return _prisma
}

export interface SeedCentreOptions {
  /** Slug stable du centre (défaut : auto-généré). */
  slug?:    string
  /** Nom affiché. */
  nom?:     string
  /** Ville (affichée publiquement). */
  ville?:   string
  /** cjsUid du jeune qui réservera (créé en utilisateur si absent). */
  cjsUid?:  string
}

export interface SeededCentre {
  centreId:     string
  slug:         string
  ressourceId:  string
  cjsUid:       string
  /** Supprime tout ce qui a été créé. À appeler dans `afterAll`. */
  cleanup:      () => Promise<void>
}

/**
 * Crée un centre actif + horaires 7/7 (08:00 → 18:00) + une ressource Salle
 * (capacité 5, durée min 60 min, pas de justif). Renvoie aussi un cjsUid de
 * test associé à un `utilisateur` minimal.
 */
export async function seedCentreWithRessource(
  opts: SeedCentreOptions = {},
): Promise<SeededCentre> {
  const prisma = getPrisma()
  const stamp = Date.now().toString(36)
  const slug = opts.slug ?? `e2e-centre-${stamp}`
  const nom = opts.nom ?? `Centre E2E ${stamp}`
  const cjsUid = opts.cjsUid ?? `e2e-uid-${stamp}`

  // Utilisateur de test (idempotent)
  await prisma.utilisateur.upsert({
    where:  { cjsUid },
    update: {},
    create: {
      cjsUid,
      email:    `${cjsUid}@example.sn`,
      nom:      'E2E',
      prenom:   'Tester',
    },
  })

  const centre = await prisma.centre.create({
    data: {
      nom,
      slug,
      region:      'Dakar',
      adresse:     '1 avenue de Test, Dakar',
      ville:       opts.ville ?? 'Dakar',
      latitude:    14.6928,
      longitude:   -17.4467,
      telephone:   '+221770000000',
      responsable: 'E2E Responsable',
      estActif:    true,
      services:    ['WiFi', 'Coworking'],
    },
  })

  // Horaires standards (lundi → dimanche, 08:00–18:00)
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const
  await prisma.centreHoraire.createMany({
    data: jours.map((jour) => ({
      centreId: centre.id,
      jour,
      ouvert:   true,
      ouvreA:   '08:00',
      fermeA:   '18:00',
    })),
  })

  const ressource = await prisma.ressourceCentre.create({
    data: {
      centreId:           centre.id,
      type:               'Salle',
      nom:                'Salle E2E',
      description:        'Salle pour tests E2E',
      capacite:           5,
      capaciteUnit:       'personnes',
      dureeMinCreneauMin: 60,
      requiresJustif:     false,
      estActive:          true,
    },
  })

  return {
    centreId:    centre.id,
    slug,
    ressourceId: ressource.id,
    cjsUid,
    cleanup: async () => {
      // Ordre : checkIns → reservations → ressources → horaires → centre → user
      await prisma.checkIn.deleteMany({ where: { centreId: centre.id } }).catch(() => {})
      await prisma.reservation.deleteMany({ where: { centreId: centre.id } }).catch(() => {})
      await prisma.ressourceCentre.deleteMany({ where: { centreId: centre.id } }).catch(() => {})
      await prisma.centreHoraire.deleteMany({ where: { centreId: centre.id } }).catch(() => {})
      await prisma.centreEvent.deleteMany({ where: { centreId: centre.id } }).catch(() => {})
      await prisma.centre.delete({ where: { id: centre.id } }).catch(() => {})
      await prisma.utilisateur.delete({ where: { cjsUid } }).catch(() => {})
    },
  }
}

/**
 * Crée une réservation `Acceptee` pour aujourd'hui à 10:00–11:00 sur le centre/ressource
 * fournis. Renvoie l'id de la réservation.
 */
export async function seedReservation(params: {
  centreId:    string
  ressourceId: string
  cjsUid:      string
}): Promise<{ reservationId: string }> {
  const prisma = getPrisma()
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const r = await prisma.reservation.create({
    data: {
      cjsUid:          params.cjsUid,
      centreId:        params.centreId,
      ressourceId:     params.ressourceId,
      dateReservee:    today,
      creneauDebut:    '10:00',
      creneauFin:      '11:00',
      nombrePersonnes: 1,
      motif:           'Réservation E2E pour test automatisé — flow complet.',
      statut:          'Acceptee',
    },
  })
  return { reservationId: r.id }
}

/** Ferme la connexion Prisma (`afterAll`). */
export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect()
    _prisma = null
  }
}
