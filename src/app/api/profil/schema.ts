import { z } from 'zod'
import { Region, Genre, Handicap, ZoneHabitation } from '@prisma/client'

/**
 * Schéma de validation du `PUT /api/profil`.
 *
 * Extrait de `route.ts` (GUIC-689) pour être testable seul : c'est lui qui
 * décide ce qui entre en base, et c'est là que se logent les trous — un tableau
 * non borné, une valeur hors référentiel, un texte sans limite de taille. Le
 * tester à travers la route entière obligerait à monter session, rate-limit et
 * Prisma pour éprouver trois lignes de règles.
 */
const REGIONS    = Object.values(Region)         as [string, ...string[]]
const GENRES     = Object.values(Genre)          as [string, ...string[]]
const HANDICAPS  = Object.values(Handicap)       as [string, ...string[]]
const ZONES      = Object.values(ZoneHabitation) as [string, ...string[]]

/**
 * GUIC-689 — Types d'opportunité recherchés (carte « Objectif & secteurs
 * visés »). Liste FERMÉE : la carte traduit chaque clé en libellé lisible, une
 * valeur libre s'y afficherait telle quelle, brute.
 */
export const TYPES_RECHERCHES = [
  'emploi',
  'stage',
  'formation',
  'financement',
  'volontariat',
  'entrepreneuriat',
] as const

export const PutProfilSchema = z.object({
  region:           z.enum(REGIONS).optional().nullable(),
  commune:          z.string().max(100).optional().nullable(),
  genre:            z.enum(GENRES).optional().nullable(),
  dateNaissance:    z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(d => {
      const date = new Date(d)
      return date < new Date() && date > new Date('1900-01-01')
    }, 'Date de naissance invalide')
    .optional().nullable(),
  biographie:       z.string().max(2000).optional().nullable(),
  niveauEtude:      z.string().max(50).optional().nullable(),
  situationEmploi:  z.string().max(50).optional().nullable(),
  // GUIC-660 — champs socio-démographiques inclusion (enums Prisma)
  situationHandicap: z.enum(HANDICAPS).optional().nullable(),
  zoneHabitation:    z.enum(ZONES).optional().nullable(),
  domainesInteret:  z.array(z.string()).max(10).optional(),
  competences:      z.array(z.string().max(80)).max(20).optional(),
  profileVisibility: z.enum(['public', 'prive']).optional(),

  // GUIC-689 — carte « Objectif & secteurs visés ».
  objectif:         z.string().max(2000).optional().nullable(),
  typesRecherches:  z.array(z.enum(TYPES_RECHERCHES)).max(TYPES_RECHERCHES.length).optional(),
  // Bornée au nombre de régions existantes : au-delà, c'est forcément un doublon
  // ou un envoi malformé.
  regionsMobilite:  z.array(z.enum(REGIONS)).max(REGIONS.length).optional(),
})

export type PutProfilInput = z.infer<typeof PutProfilSchema>
