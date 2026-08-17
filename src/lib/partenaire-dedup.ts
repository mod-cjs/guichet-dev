/**
 * GUIC-705 — dédup pour la promotion « curation → partenaire ».
 *
 * Un employeur curé n'existe que comme texte (`Opportunite.organisationLibelle`). Avant de
 * créer une Organisation, on suggère les partenaires existants dont le nom normalisé
 * correspond (« GIZ Sénégal SARL » ≈ « giz senegal ») pour éviter les doublons. L'admin
 * tranche — jamais de fusion silencieuse.
 */
import { prisma } from '@/lib/prisma'

/** Formes juridiques retirées en fin de nom (ne changent pas l'identité de l'employeur). */
const FORMES = new Set(['sarl', 'suarl', 'sarlu', 'sasu', 'sas', 'sa', 'eurl', 'gie', 'sl', 'ci'])

/** Normalise un nom d'organisation : minuscule, sans accents ni ponctuation, forme juridique retirée. */
export function normaliserNomOrg(nom: string): string {
  const base = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const toks = base.split(' ').filter(Boolean)
  // Retire la forme juridique en fin — mais jamais si c'est le seul mot (un nom == "SARL" reste "sarl").
  while (toks.length > 1 && FORMES.has(toks[toks.length - 1])) toks.pop()
  return toks.join(' ')
}

export interface SuggestionPartenaire {
  id: string
  nom: string
  secteur: string | null
  estVerifie: boolean
}

/**
 * Suggère les partenaires existants proches d'un libellé d'employeur (dédup).
 * Match sur le nom normalisé : égalité, ou l'un préfixe/contient l'autre. Borné.
 */
export async function suggererPartenaires(libelle: string, max = 6): Promise<SuggestionPartenaire[]> {
  const cible = normaliserNomOrg(libelle)
  if (!cible) return []
  // 1er mot significatif comme filtre SQL grossier (réduit le scan), affinage en mémoire.
  const premier = cible.split(' ')[0]
  const candidats = await prisma.organisation.findMany({
    where: { nom: { contains: premier } },
    select: { id: true, nom: true, secteur: true, estVerifie: true },
    take: 50,
  })
  return candidats
    .map((c) => ({ c, n: normaliserNomOrg(c.nom) }))
    .filter(({ n }) => n === cible || n.includes(cible) || cible.includes(n))
    .slice(0, max)
    .map(({ c }) => c)
}
