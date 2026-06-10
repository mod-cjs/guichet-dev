/**
 * Seed Lot 7 Centres CJS — GUIC-351 / EPIC GUIC-350.
 *
 * Étend les 9 centres existants (issus de `prisma/seed/centres.ts` — GUIC-238)
 * avec :
 *  - slug auto-généré
 *  - services (string[] depuis enum CentreService)
 *  - conseillersCount + email + ville
 *  - horaires standards (Lun-Ven 08-18, Sam 09-13, Dim fermé), surchargeables
 *  - ~30 ressources démo (3-4 par centre, mix Salle / Vehicule / Poste_info)
 *  - 3 utilisateurs staff démo (via `AgentCentre` existant — cf ADR-001)
 *
 * Idempotent : upsert sur clé primaire, skip si déjà présent.
 */

import type { PrismaClient, CentreService, Jour, TypeRessourceCentre, RoleAgent } from '@prisma/client'

const SERVICES_DEFAUT: CentreService[] = [
  'WiFi',
  'Conseiller',
  'Salle_reunion',
  'Postes_info',
  'Imprimante',
]

const HORAIRES_STANDARDS: Array<{ jour: Jour; ouvert: boolean; ouvreA: string | null; fermeA: string | null }> = [
  { jour: 'Lundi',    ouvert: true,  ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Mardi',    ouvert: true,  ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Mercredi', ouvert: true,  ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Jeudi',    ouvert: true,  ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Vendredi', ouvert: true,  ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Samedi',   ouvert: true,  ouvreA: '09:00', fermeA: '13:00' },
  { jour: 'Dimanche', ouvert: false, ouvreA: null,    fermeA: null    },
]

interface RessourceSeed {
  type: TypeRessourceCentre
  nom: string
  description: string
  capacite: number
  capaciteUnit: string
  dureeMinCreneauMin: number
  requiresJustif: boolean
}

const RESSOURCES_PAR_CENTRE: RessourceSeed[] = [
  {
    type: 'Salle',
    nom: 'Salle de réunion principale',
    description: 'Grande salle équipée écran + projecteur. Idéale pour atelier, formation, réunion projet.',
    capacite: 20,
    capaciteUnit: 'personnes',
    dureeMinCreneauMin: 120,
    requiresJustif: false,
  },
  {
    type: 'Poste_info',
    nom: 'Espace coworking — postes informatiques',
    description: '6 postes équipés Internet, Office, suite Adobe. Idéal CV, candidatures, projet numérique.',
    capacite: 6,
    capaciteUnit: 'postes',
    dureeMinCreneauMin: 60,
    requiresJustif: false,
  },
  {
    type: 'Vehicule',
    nom: 'Véhicule utilitaire 9 places',
    description: 'Mini-bus pour déplacement collectif (forum, visite entreprise). Permis requis.',
    capacite: 9,
    capaciteUnit: 'personnes',
    dureeMinCreneauMin: 240,
    requiresJustif: true,
  },
  {
    type: 'Equipement',
    nom: 'Kit captation vidéo (caméra + micro)',
    description: 'Équipement pour vlog, témoignage, captation événement.',
    capacite: 1,
    capaciteUnit: 'kit',
    dureeMinCreneauMin: 120,
    requiresJustif: false,
  },
]

const STAFF_DEMO: Array<{ centreNomHint: string; cjsUid: string; role: RoleAgent }> = [
  { centreNomHint: 'tambacounda', cjsUid: 'demo-staff-tamba-admin',      role: 'admin_centre' },
  { centreNomHint: 'tambacounda', cjsUid: 'demo-staff-tamba-conseiller', role: 'conseiller'   },
  { centreNomHint: 'dakar',       cjsUid: 'demo-staff-dakar-admin',      role: 'admin_centre' },
]

function slugify(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

export async function seedLot7(prisma: PrismaClient): Promise<void> {
  const centres = await prisma.centre.findMany({ where: { estActif: true } })
  if (centres.length === 0) {
    console.log('  ⏭  Lot 7 seed skipped — aucun centre à enrichir (lancer seedCentres d\'abord).')
    return
  }

  let centresEnriched = 0
  let horairesCreated = 0
  let ressourcesCreated = 0
  let staffCreated = 0

  for (const centre of centres) {
    const slug = centre.slug ?? slugify(centre.nom)
    const email = centre.email ?? `${slug.replace(/^cjs-/, '')}@consortiumjeunesse.sn`
    const ville = centre.ville ?? centre.nom.replace(/^CJS\s+/i, '').trim()
    const hasServices = Array.isArray(centre.services) && (centre.services as unknown[]).length > 0
    const servicesValue: unknown = hasServices ? centre.services : SERVICES_DEFAUT

    await prisma.centre.update({
      where: { id: centre.id },
      data: {
        slug,
        email: centre.email ?? email,
        ville: centre.ville ?? ville,
        services: servicesValue as object,
        conseillersCount: centre.conseillersCount > 0 ? centre.conseillersCount : 3,
        description:
          centre.description ??
          `Centre CJS de ${ville}. Espace d'accompagnement, conseil, formation et mise en réseau pour les 16-35 ans.`,
      },
    })
    centresEnriched++

    for (const h of HORAIRES_STANDARDS) {
      await prisma.centreHoraire.upsert({
        where: { centreId_jour: { centreId: centre.id, jour: h.jour } },
        update: {},
        create: {
          centreId: centre.id,
          jour:     h.jour,
          ouvert:   h.ouvert,
          ouvreA:   h.ouvreA,
          fermeA:   h.fermeA,
        },
      })
      horairesCreated++
    }

    const existingRes = await prisma.ressourceCentre.count({ where: { centreId: centre.id } })
    if (existingRes === 0) {
      for (const r of RESSOURCES_PAR_CENTRE) {
        await prisma.ressourceCentre.create({
          data: {
            centreId:           centre.id,
            type:               r.type,
            nom:                r.nom,
            description:        r.description,
            capacite:           r.capacite,
            capaciteUnit:       r.capaciteUnit,
            dureeMinCreneauMin: r.dureeMinCreneauMin,
            requiresJustif:     r.requiresJustif,
          },
        })
        ressourcesCreated++
      }
    }
  }

  // Staff démo : ne crée PAS les utilisateurs (source vérité = SSO).
  // Skip silencieusement si l'utilisateur démo n'existe pas en base.
  for (const s of STAFF_DEMO) {
    const centre = centres.find(c => c.nom.toLowerCase().includes(s.centreNomHint))
    if (!centre) continue
    const userExists = await prisma.utilisateur.findUnique({ where: { cjsUid: s.cjsUid } })
    if (!userExists) continue
    const existing = await prisma.agentCentre.findFirst({
      where: { cjsUid: s.cjsUid, centreId: centre.id },
    })
    if (!existing) {
      await prisma.agentCentre.create({
        data: {
          cjsUid:   s.cjsUid,
          centreId: centre.id,
          role:     s.role,
        },
      })
      staffCreated++
    }
  }

  console.log(
    `  ✓ Lot 7 seed : ${centresEnriched} centres enrichis · ${horairesCreated} horaires · ` +
    `${ressourcesCreated} ressources · ${staffCreated} staff démo`,
  )
}
