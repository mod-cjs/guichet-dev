/**
 * M13 / Data Hub — dictionnaire consultable, dérivé du manifeste du tap.
 *
 * POURQUOI PARTIR DU MANIFESTE ET NON DU SCHÉMA PRISMA
 * Les deux décrivent les mêmes colonnes, mais pas sous la même forme. Le schéma Prisma
 * porte les noms INTERNES du Guichet ; le manifeste porte les noms EXPORTÉS, ceux qui
 * atterrissent réellement dans l'entrepôt (`@map`, alias `as`, clés composites), plus deux
 * informations que le schéma n'a pas : la méthode de réplication et le tier de gouvernance
 * CDP de chaque colonne. Un analyste lit ce qui arrive chez lui, pas ce que le Guichet
 * stocke — c'est donc le contrat servi qu'il faut afficher.
 *
 * Cette couche ne fait que remettre en forme : aucune description n'est rédigée ici. La
 * prose vient des `///` de `schema.prisma`, une seule fois, et descend jusqu'ici comme elle
 * descend jusqu'aux `COMMENT` PostgreSQL et à l'OpenAPI.
 */
import type { TapManifest } from './tap-manifest'

export interface ColonneDictionnaire {
  /** Nom de la colonne. Doublé en `id` : <DataTable/> exige une clé de ligne nommée ainsi. */
  id: string
  nom: string
  /** Types JSON Schema hors `null`, joints par « | » — la nullabilité a son propre drapeau. */
  type: string
  nullable: boolean
  /** Format JSON Schema (`date-time`, `email`…), `null` s'il n'y en a pas. */
  format: string | null
  /** Valeurs admises, `null` exclu : il est déjà porté par `nullable`. */
  valeurs: string[] | null
  description: string
  /** Tier de gouvernance CDP (`public` / `pseudonyme`). */
  tier: string
}

export interface FluxDictionnaire {
  /** Nom du flux, doublé en `id` pour les listes React. */
  id: string
  /** Nom du flux Singer — identique au nom de la table dans l'entrepôt. */
  nom: string
  chemin: string
  replication: 'INCREMENTAL' | 'FULL_TABLE'
  clesPrimaires: string[]
  /** `null` pour un flux FULL_TABLE : aucun watermark disponible. */
  cleReplication: string | null
  colonnes: ColonneDictionnaire[]
}

/** Forme d'une propriété JSON Schema telle que `construireProperties` la produit. */
interface ProprieteSinger {
  type?: string | string[]
  format?: string
  enum?: (string | null)[]
  description?: string
  'x-cjs-tier'?: string
}

function lireColonne(nom: string, brut: unknown): ColonneDictionnaire {
  const propriete = (brut ?? {}) as ProprieteSinger
  const types = Array.isArray(propriete.type)
    ? propriete.type
    : propriete.type
      ? [propriete.type]
      : []
  const valeurs = propriete.enum?.filter((v): v is string => v !== null) ?? []

  return {
    id: nom,
    nom,
    type: types.filter((t) => t !== 'null').join(' | ') || 'inconnu',
    nullable: types.includes('null'),
    format: propriete.format ?? null,
    valeurs: valeurs.length > 0 ? valeurs : null,
    description: propriete.description ?? '',
    tier: propriete['x-cjs-tier'] ?? 'public',
  }
}

export function buildDictionnaire(manifest: TapManifest): FluxDictionnaire[] {
  return manifest.streams.map((stream) => ({
    id: stream.name,
    nom: stream.name,
    chemin: stream.path,
    replication: stream.replication_method,
    clesPrimaires: stream.primary_keys,
    cleReplication: stream.replication_key ?? null,
    colonnes: Object.entries(stream.schema.properties).map(([nom, brut]) => lireColonne(nom, brut)),
  }))
}

/**
 * Repli de comparaison : la documentation est rédigée en français, et personne ne tape
 * « Région » avec son accent dans un champ de recherche.
 */
function normaliser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Tier de gouvernance CDP demandé, ou « tous » pour ne pas filtrer.
 *
 * `pseudonyme` isole les colonnes qui portent de la donnée personnelle : c'est la vue dont
 * un DPO a besoin pour répondre à « que sort-il réellement de la plateforme ? », question
 * à laquelle il fallait jusqu'ici lire le catalogue Singer à la main.
 */
export type TierFiltre = 'tous' | 'public' | 'pseudonyme'

/**
 * Filtre le dictionnaire sur une requête libre et un tier de gouvernance.
 *
 * Deux niveaux volontairement différents : un flux dont le NOM correspond est rendu
 * entier (on cherche la table, on veut toutes ses colonnes), alors qu'un flux retenu par
 * une de ses colonnes est réduit à celles qui correspondent — sinon chercher « region »
 * renvoie 40 colonnes dont une seule intéresse.
 */
export function filtrerDictionnaire(
  flux: readonly FluxDictionnaire[],
  requete: string,
  tier: TierFiltre = 'tous',
): FluxDictionnaire[] {
  // Le tier s'applique AVANT le texte : chercher « region » dans la vue pseudonyme doit
  // rendre vide, pas rendre une colonne publique parce que son nom correspondait.
  const parTier =
    tier === 'tous'
      ? [...flux]
      : flux
          .map((f) => ({ ...f, colonnes: f.colonnes.filter((c) => c.tier === tier) }))
          .filter((f) => f.colonnes.length > 0)

  const q = normaliser(requete)
  if (q.length === 0) return parTier

  const retenus: FluxDictionnaire[] = []
  for (const f of parTier) {
    if (normaliser(f.nom).includes(q)) {
      retenus.push(f)
      continue
    }
    const colonnes = f.colonnes.filter((c) => normaliser(`${c.nom} ${c.description}`).includes(q))
    if (colonnes.length > 0) retenus.push({ ...f, colonnes })
  }
  return retenus
}

/** Échappe une cellule CSV (RFC 4180) — même règle que les exports admin existants. */
function celluleCsv(valeur: string): string {
  return /[",\n;]/.test(valeur) ? `"${valeur.replace(/"/g, '""')}"` : valeur
}

const ENTETE_CSV = [
  'flux',
  'chemin',
  'replication',
  'cles_primaires',
  'cle_replication',
  'colonne',
  'type',
  'nullable',
  'format',
  'valeurs_admises',
  'description',
  'tier',
]

/**
 * Sérialise le dictionnaire en CSV — UNE LIGNE PAR COLONNE, pas par flux.
 *
 * C'est la forme qu'un analyste colle dans un tableur : il veut trier et filtrer 163
 * colonnes, pas déplier 19 objets imbriqués. Le contexte du flux (nom, chemin, réplication,
 * clés) est donc reporté sur chaque ligne — redondant à la lecture, indispensable au tri.
 *
 * Le BOM et les fins de ligne CRLF ne sont pas de la coquetterie : sans BOM, Excel lit le
 * fichier en latin-1 et affiche « RÃ©gion » ; sans CRLF, certaines versions ne coupent pas
 * les lignes.
 */
export function construireCsvDictionnaire(flux: readonly FluxDictionnaire[]): string {
  const lignes = flux.flatMap((f) =>
    f.colonnes.map((c) =>
      [
        f.nom,
        f.chemin,
        f.replication,
        f.clesPrimaires.join(' + '),
        f.cleReplication ?? '',
        c.nom,
        c.type,
        c.nullable ? 'oui' : 'non',
        c.format ?? '',
        // Séparateur « | » et non la virgule : une liste de valeurs entre virgules dans une
        // cellule CSV se relit mal, même correctement échappée.
        c.valeurs ? c.valeurs.join(' | ') : '',
        c.description,
        c.tier,
      ]
        .map(celluleCsv)
        .join(','),
    ),
  )

  return '\ufeff' + [ENTETE_CSV.join(','), ...lignes].join('\r\n')
}

const LIBELLE_TIER: Record<Exclude<TierFiltre, 'tous'>, string> = {
  public: 'colonnes publiques',
  pseudonyme: 'colonnes pseudonymes',
}

/**
 * Énonce le filtre actif en toutes lettres, ou `null` si rien n'est filtré.
 *
 * Sert au document imprimé : un extrait sur papier ne porte plus son URL, et rien ne
 * distingue « le dictionnaire » de « les 50 colonnes pseudonymes du dictionnaire ». Une
 * PDF transmise à un partenaire sans cette mention se lit comme le contrat complet.
 */
export function libelleFiltre(requete: string, tier: TierFiltre): string | null {
  const morceaux: string[] = []
  if (tier !== 'tous') morceaux.push(LIBELLE_TIER[tier])
  if (requete.trim().length > 0) morceaux.push(`recherche « ${requete.trim()} »`)
  return morceaux.length > 0 ? morceaux.join(' · ') : null
}
