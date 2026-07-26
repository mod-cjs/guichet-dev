/**
 * Mapping secteur (`Domaine`) → couleur letterhead + libellé, pour les cartes
 * partenaire (GUIC-681). Logique pure (testable) ; les couleurs vivent en
 * tokens `--gj-sector-*` (triplets RGB) dans `tokens.css`.
 */

const KNOWN_SECTORS = [
  'agriculture',
  'numerique',
  'entrepreneuriat',
  'citoyennete',
  'environnement',
  'sante',
  'education',
  'culture',
  'autre',
] as const

/** Normalise une valeur de secteur vers une clé connue (sinon `autre`). */
export function sectorKey(secteur: string | null | undefined): string {
  const k = (secteur ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents (marques combinantes)
  return (KNOWN_SECTORS as readonly string[]).includes(k) ? k : 'autre'
}

/** Nom du token RGB (triplet) du secteur — ex. `--gj-sector-numerique`. */
export function sectorVar(secteur: string | null | undefined): string {
  return `--gj-sector-${sectorKey(secteur)}`
}

/** Libellé lisible du secteur (underscores → espaces, 1re lettre capitalisée). */
export function sectorLabel(secteur: string | null | undefined): string {
  if (!secteur) return 'Autre'
  const s = secteur.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
