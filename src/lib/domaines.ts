/**
 * Vocabulaire des domaines d'opportunité — SOURCE UNIQUE.
 *
 * Il était jusqu'ici recopié dans cinq fichiers (formulaire admin, modale
 * partenaires, action recruteur, panneau de filtres, feuille mobile). Cinq
 * copies d'une même liste dérivent : c'est ce qui a rendu ce changement de
 * taxonomie plus coûteux qu'il n'aurait dû l'être.
 *
 * Refonte demandée par le PO le 2026-08-17 : six catégories, remplaçant les
 * neuf précédentes.
 *
 * ⚠ À NE PAS CONFONDRE avec `DOMAINES_INTERET` (`@/lib/profil-constants`), le
 * référentiel de SECTEURS du profil — « Artisanat », « BTP », « Transport »,
 * « Tourisme »… C'est du texte libre choisi par le jeune à l'onboarding, un
 * vocabulaire distinct que cette refonte ne touche pas. Les deux se
 * rapprochent uniquement via `mapperDomaine()` (mots-clés), utilisé par le
 * tableau de bord pour recommander des offres à partir des intérêts déclarés.
 */
import type { Domaine } from '@prisma/client'

/**
 * Domaines proposés à l'utilisateur, dans l'ordre d'affichage.
 *
 * `Autre` n'y figure PAS : ce n'est pas un choix, c'est un repli technique
 * (voir plus bas).
 */
export const DOMAINES_VISIBLES = [
  'BienEtre',
  'Citoyennete',
  'Culture',
  'Ecologie',
  'Economie',
  'Employabilite',
] as const satisfies readonly Domaine[]

export type DomaineVisible = (typeof DOMAINES_VISIBLES)[number]

/**
 * `Autre` reste dans l'enum sans être proposé nulle part.
 *
 * Raison : `domaineOuAutre()` (curation, `src/lib/curation/publication/mapper.ts`)
 * s'en sert comme repli quand l'extraction automatique produit un domaine non
 * reconnu. Le supprimer ferait échouer la publication d'un item mal étiqueté —
 * et un test le vérifie explicitement (« domaine non mappable → défaut Autre »).
 *
 * Il ne doit donc jamais apparaître dans un filtre ni dans un formulaire : une
 * offre en `Autre` est une offre à reclasser, pas une catégorie que
 * l'utilisateur choisit.
 */
export const DOMAINE_REPLI = 'Autre' satisfies Domaine

export const DOMAINE_LABELS: Record<Domaine, string> = {
  BienEtre: 'Bien-être',
  Citoyennete: 'Citoyenneté',
  Culture: 'Culture',
  Ecologie: 'Écologie',
  Economie: 'Économie',
  Employabilite: 'Employabilité',
  Autre: 'Non classé',
}

/**
 * Correspondance depuis l'ancien vocabulaire (neuf valeurs), appliquée aux
 * offres existantes par la migration `20260817..._taxonomie_domaines`.
 *
 * Conservée ici parce qu'elle documente une décision, pas seulement une
 * opération : `Agriculture` et `Numerique` rejoignent `Economie` en tant que
 * secteurs d'activité — ce sont des emplois et des financements dans ces
 * filières, pas des sujets écologiques ou pédagogiques. `Education` rejoint
 * `Employabilite` : sur cette plateforme, les formations servent l'insertion.
 */
export const MIGRATION_DOMAINES: Record<string, Domaine> = {
  Agriculture: 'Economie',
  Numerique: 'Economie',
  Entrepreneuriat: 'Economie',
  Citoyennete: 'Citoyennete',
  Environnement: 'Ecologie',
  Sante: 'BienEtre',
  Education: 'Employabilite',
  Culture: 'Culture',
  Autre: 'Autre',
}

/** Libellé affichable d'un domaine, repli compris. */
export function libelleDomaine(d: Domaine): string {
  return DOMAINE_LABELS[d] ?? DOMAINE_LABELS.Autre
}
