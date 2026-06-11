import type { PrismaClient } from '@prisma/client'
import { Region } from '@prisma/client'

/**
 * Seed des centres CJS — GUIC-238.
 *
 * Liste de référence des 9 centres CJS du Sénégal (régions YEAH 2025).
 *
 * Identifiants déterministes (UUID v4 fixés) — la table `centres` n'a pas de
 * contrainte unique sur `nom`, donc l'upsert se fait sur l'`id` pour rester
 * idempotent (relance du seed = pas de doublon, pas d'erreur).
 *
 * Coordonnées GPS : chefs-lieux régionaux (référence Wikipedia / OSM).
 * `gcId` (lien interop Gestion Centres) laissé `null` — sera renseigné par
 * la sync M10 quand l'interop sera branchée.
 */

interface CentreSeed {
  id: string
  nom: string
  region: Region
  adresse: string
  latitude: number
  longitude: number
  telephone: string
  responsable: string
}

const CENTRES: CentreSeed[] = [
  {
    id: '11111111-1111-4111-8111-000000000001',
    nom: 'CJS Dakar',
    region: Region.Dakar,
    adresse: 'Avenue Cheikh Anta Diop, Dakar',
    latitude: 14.6928,
    longitude: -17.4467,
    telephone: '+221338201234',
    responsable: 'Responsable CJS Dakar',
  },
  {
    id: '11111111-1111-4111-8111-000000000002',
    nom: 'CJS Thiès',
    region: Region.Thies,
    adresse: 'Avenue Léopold Sédar Senghor, Thiès',
    latitude: 14.7886,
    longitude: -16.9260,
    telephone: '+221339511234',
    responsable: 'Responsable CJS Thiès',
  },
  {
    id: '11111111-1111-4111-8111-000000000003',
    nom: 'CJS Saint-Louis',
    region: Region.Saint_Louis,
    adresse: 'Rue Khalifa Ababacar Sy, Saint-Louis',
    latitude: 16.0179,
    longitude: -16.4896,
    telephone: '+221339611234',
    responsable: 'Responsable CJS Saint-Louis',
  },
  {
    id: '11111111-1111-4111-8111-000000000004',
    nom: 'CJS Matam',
    region: Region.Matam,
    adresse: 'Quartier Sinthiou, Matam',
    latitude: 15.6559,
    longitude: -13.2554,
    telephone: '+221339661234',
    responsable: 'Responsable CJS Matam',
  },
  {
    id: '11111111-1111-4111-8111-000000000005',
    nom: 'CJS Tambacounda',
    region: Region.Tambacounda,
    adresse: 'Quartier Plateau, Tambacounda',
    latitude: 13.7707,
    longitude: -13.6673,
    telephone: '+221332811234',
    responsable: 'Responsable CJS Tambacounda',
  },
  {
    id: '11111111-1111-4111-8111-000000000006',
    nom: 'CJS Kédougou',
    region: Region.Kedougou,
    adresse: 'Centre-ville, Kédougou',
    latitude: 12.5572,
    longitude: -12.1742,
    telephone: '+221339851234',
    responsable: 'Responsable CJS Kédougou',
  },
  {
    id: '11111111-1111-4111-8111-000000000007',
    nom: 'CJS Kolda',
    region: Region.Kolda,
    adresse: 'Quartier Saré Moussa, Kolda',
    latitude: 12.8838,
    longitude: -14.9412,
    telephone: '+221339961234',
    responsable: 'Responsable CJS Kolda',
  },
  {
    id: '11111111-1111-4111-8111-000000000008',
    nom: 'CJS Sédhiou',
    region: Region.Sedhiou,
    adresse: 'Quartier Sourang, Sédhiou',
    latitude: 12.7081,
    longitude: -15.5569,
    telephone: '+221339951234',
    responsable: 'Responsable CJS Sédhiou',
  },
  {
    id: '11111111-1111-4111-8111-000000000009',
    nom: 'CJS Ziguinchor',
    region: Region.Ziguinchor,
    adresse: 'Boulevard 54e RIAOM, Ziguinchor',
    latitude: 12.5681,
    longitude: -16.2719,
    telephone: '+221339911234',
    responsable: 'Responsable CJS Ziguinchor',
  },
]

export async function seedCentres(prisma: PrismaClient): Promise<number> {
  for (const c of CENTRES) {
    await prisma.centre.upsert({
      where: { id: c.id },
      update: {
        nom: c.nom,
        region: c.region,
        adresse: c.adresse,
        latitude: c.latitude,
        longitude: c.longitude,
        telephone: c.telephone,
        responsable: c.responsable,
        estActif: true,
      },
      create: {
        id: c.id,
        nom: c.nom,
        region: c.region,
        adresse: c.adresse,
        latitude: c.latitude,
        longitude: c.longitude,
        telephone: c.telephone,
        responsable: c.responsable,
        estActif: true,
        // Lot 7 W0 (GUIC-351) — services NOT NULL en base (MariaDB ne respecte
        // pas @default("[]") du schema Prisma sur INSERT). Valeur explicite.
        services: [],
      },
    })
  }
  return CENTRES.length
}
