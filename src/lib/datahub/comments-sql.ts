/**
 * M13 / Data Hub — génération des `COMMENT` MariaDB depuis la documentation du schéma
 * (spec §7.3).
 *
 * POURQUOI C'EST PLUS SUBTIL QU'IL N'Y PARAÎT
 * MariaDB n'a pas de `COMMENT ON COLUMN` — c'est du PostgreSQL. Commenter une colonne
 * impose un `ALTER TABLE … MODIFY COLUMN` qui REDONNE la définition entière. En omettre
 * un élément (le défaut, un `auto_increment`, un `on update`) le supprime silencieusement.
 *
 * Corollaire redouté : toute migration Prisma ultérieure qui touche une colonne émet un
 * `MODIFY COLUMN` SANS clause `COMMENT` et efface le commentaire, sans erreur ni warning.
 * Les commentaires ne se posent donc pas une fois à la main — ils se resynchronisent après
 * chaque `migrate deploy`, ce que rend possible l'idempotence implémentée ici.
 *
 * RÈGLE DE SÛRETÉ — la définition n'est JAMAIS retraduite depuis les types Prisma vers
 * MariaDB. Elle est relue telle quelle dans `information_schema` et réémise. Les formes
 * suivantes ont été relevées en base sur MariaDB 11, pas supposées :
 *   - défaut chaîne ou enum : arrive DÉJÀ quoté      → `'actif'`, réémis verbatim
 *   - défaut expression     : arrive nu              → `current_timestamp(3)`
 *   - aucun défaut          : SQL NULL               → clause omise
 * Requoter un défaut déjà quoté produirait `DEFAULT ''actif''` et casserait la table.
 */

/** Limites MariaDB. Au-delà, le serveur refuse l'ALTER. */
export const MAX_COLUMN_COMMENT = 1024
export const MAX_TABLE_COMMENT = 2048

export interface ColumnMeta {
  table: string
  column: string
  /** `COLUMN_TYPE` — la forme complète (`varchar(36)`, `enum('a','b')`), pas `DATA_TYPE`. */
  columnType: string
  isNullable: boolean
  /** `COLUMN_DEFAULT` verbatim, déjà quoté par MariaDB s'il s'agit d'un littéral. */
  columnDefault: string | null
  /** `EXTRA` : `auto_increment`, `on update current_timestamp(3)`, ou vide. */
  extra: string
  /** `COLUMN_COMMENT` actuel — sert l'idempotence. */
  currentComment: string
}

/** Échappement d'un littéral chaîne MySQL : l'antislash d'abord, sinon on double le sien. */
function escapeLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''")
}

/**
 * Aplatit une documentation multi-ligne et la borne à la limite MariaDB. La troncature
 * coupe sur une frontière de mot et marque la coupe : un commentaire tronqué au milieu
 * d'un mot se lit comme une donnée corrompue plutôt que comme un texte abrégé.
 */
export function normalizeComment(doc: string, max: number): string {
  // Hors-BMP retiré AVANT tout le reste. Vérifié en base : MariaDB stocke les
  // métadonnées de commentaire dans un jeu de caractères qui n'accepte pas les
  // caractères sur quatre octets — un `👍` posé ressort en `?`. Le commentaire relu ne
  // correspondait alors jamais à celui voulu et le script le repostait indéfiniment.
  // Les caractères BMP de la documentation française (→, —, é, ⚠) passent sans dommage.
  const flat = doc
    .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * `ALTER TABLE … MODIFY COLUMN` posant le commentaire, ou `null` s'il n'y a rien à faire
 * — documentation vide, ou commentaire déjà identique en base.
 */
export function buildColumnCommentSql(column: ColumnMeta, doc: string): string | null {
  const comment = normalizeComment(doc, MAX_COLUMN_COMMENT)
  if (comment === '') return null
  if (comment === column.currentComment) return null

  const parts = [
    `\`${column.column}\``,
    column.columnType,
    column.isNullable ? 'NULL' : 'NOT NULL',
  ]
  if (column.columnDefault !== null) parts.push(`DEFAULT ${column.columnDefault}`)
  if (column.extra.trim() !== '') parts.push(column.extra.trim())
  parts.push(`COMMENT '${escapeLiteral(comment)}'`)

  return `ALTER TABLE \`${column.table}\` MODIFY COLUMN ${parts.join(' ')};`
}

/** Commentaire de table — syntaxe distincte, sans redéfinition de colonne. */
export function buildTableCommentSql(
  table: string,
  currentComment: string,
  doc: string
): string | null {
  const comment = normalizeComment(doc, MAX_TABLE_COMMENT)
  if (comment === '') return null
  if (comment === currentComment) return null
  return `ALTER TABLE \`${table}\` COMMENT = '${escapeLiteral(comment)}';`
}
