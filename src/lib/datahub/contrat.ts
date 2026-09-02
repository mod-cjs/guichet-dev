/**
 * M13 / Data Hub — le contrat d'export, prêt à afficher.
 *
 * ON LIT L'ARTEFACT GÉNÉRÉ, PAS LE SCHÉMA PRISMA.
 * `buildTapManifest()` recalculerait exactement la même chose, mais par un `readFileSync`
 * au moment du rendu : Turbopack voit alors une lecture disque dynamique dans un composant
 * serveur et trace TOUT le projet dans la sortie standalone (« Encountered unexpected file
 * in NFT list »), ce qui alourdit l'image Docker pour rien. `streams.json` est le contrat
 * réellement publié aux consommateurs, régénéré par `npm run datahub:tap` et gardé contre
 * toute retouche manuelle par `tests/unit/datahub-tap-manifest.test.ts` — l'importer est
 * donc aussi fiable que le recalculer, et statique.
 *
 * Constante de module : le contrat est figé pour la durée d'un déploiement.
 */
import streams from '../../../etl/plugins/extractors/tap-guichet/tap_guichet/streams.json'
import { buildDictionnaire } from './dictionnaire'
import type { TapManifest } from './tap-manifest'

/**
 * Le `as unknown as` est nécessaire : TypeScript élargit les littéraux d'un JSON importé
 * (`replication_method` devient `string`, pas `'INCREMENTAL' | 'FULL_TABLE'`).
 */
export const DICTIONNAIRE = buildDictionnaire(streams as unknown as TapManifest)
