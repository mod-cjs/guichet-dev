/**
 * M13 / Data Hub — génération des `COMMENT` MariaDB (lot 2, spec §7.3).
 *
 * MariaDB n'a pas de `COMMENT ON COLUMN` — c'est du PostgreSQL. Commenter une colonne
 * impose un `ALTER TABLE … MODIFY COLUMN` qui REDONNE la définition entière : type,
 * nullabilité, défaut, attributs. En omettre un seul élément le supprime silencieusement.
 *
 * D'où la règle de conception vérifiée ici : la définition n'est jamais retraduite depuis
 * les types Prisma, elle est relue telle quelle dans `information_schema` et réémise.
 * Les formes ci-dessous sont celles réellement renvoyées par MariaDB 11 sur ce schéma,
 * relevées en base et non supposées :
 *   - un défaut chaîne ou enum arrive DÉJÀ entre quotes  → `'actif'`
 *   - un défaut expression arrive nu                     → `current_timestamp(3)`
 *   - aucun défaut                                       → SQL NULL, clause omise
 */
import {
  buildColumnCommentSql,
  buildTableCommentSql,
  normalizeComment,
  MAX_COLUMN_COMMENT,
  type ColumnMeta,
} from '@/lib/datahub/comments-sql'

function col(overrides: Partial<ColumnMeta> = {}): ColumnMeta {
  return {
    table: 'utilisateurs',
    column: 'cjs_uid',
    columnType: 'varchar(36)',
    isNullable: false,
    columnDefault: null,
    extra: '',
    currentComment: '',
    ...overrides,
  }
}

describe('buildColumnCommentSql — reconstruction de la définition', () => {
  it('réémet type et nullabilité pour une colonne simple', () => {
    expect(buildColumnCommentSql(col(), 'Claim sub du token SSO')).toBe(
      "ALTER TABLE `utilisateurs` MODIFY COLUMN `cjs_uid` varchar(36) NOT NULL COMMENT 'Claim sub du token SSO';"
    )
  })

  it('marque explicitement une colonne nullable', () => {
    const sql = buildColumnCommentSql(col({ column: 'origine', isNullable: true }), 'Origine')
    expect(sql).toContain('`origine` varchar(36) NULL COMMENT')
  })

  it("réémet un défaut chaîne sans le requoter — MariaDB le rend déjà quoté", () => {
    const sql = buildColumnCommentSql(
      col({ column: 'statut', columnType: "enum('actif','inactif')", columnDefault: "'actif'" }),
      'Statut du compte'
    )
    expect(sql).toContain("enum('actif','inactif') NOT NULL DEFAULT 'actif' COMMENT")
    expect(sql).not.toContain("DEFAULT ''actif''")
  })

  it('réémet un défaut expression sans le quoter', () => {
    const sql = buildColumnCommentSql(
      col({ column: 'created_at', columnType: 'datetime(3)', columnDefault: 'current_timestamp(3)' }),
      'Création'
    )
    expect(sql).toContain('DEFAULT current_timestamp(3) COMMENT')
  })

  it('omet la clause DEFAULT quand la colonne n\'en a pas', () => {
    expect(buildColumnCommentSql(col(), 'x')).not.toContain('DEFAULT')
  })

  it('conserve les attributs EXTRA, sinon un auto_increment est perdu', () => {
    const sql = buildColumnCommentSql(
      col({ table: 'consultations', column: 'id', columnType: 'bigint(20)', extra: 'auto_increment' }),
      'Identifiant'
    )
    expect(sql).toContain('bigint(20) NOT NULL auto_increment COMMENT')
  })

  it('conserve un ON UPDATE', () => {
    const sql = buildColumnCommentSql(
      col({ columnType: 'datetime(3)', extra: 'on update current_timestamp(3)' }),
      'x'
    )
    expect(sql).toContain('NOT NULL on update current_timestamp(3) COMMENT')
  })
})

describe('buildColumnCommentSql — échappement et idempotence', () => {
  it("échappe les apostrophes, omniprésentes en français", () => {
    const sql = buildColumnCommentSql(col(), "Jamais d'IP en clair en base")
    expect(sql).toContain("COMMENT 'Jamais d''IP en clair en base'")
  })

  it('échappe les antislashs, que MySQL interprète', () => {
    const sql = buildColumnCommentSql(col(), 'Chemin C:\\temp')
    expect(sql).toContain("COMMENT 'Chemin C:\\\\temp'")
  })

  it('ne produit aucun statement quand le commentaire est déjà à jour', () => {
    expect(buildColumnCommentSql(col({ currentComment: 'Déjà posé' }), 'Déjà posé')).toBeNull()
  })

  it('produit un statement quand le commentaire a changé', () => {
    expect(buildColumnCommentSql(col({ currentComment: 'Ancien' }), 'Nouveau')).not.toBeNull()
  })

  it('ne produit rien pour une documentation vide', () => {
    expect(buildColumnCommentSql(col(), '   ')).toBeNull()
  })
})

describe('normalizeComment', () => {
  it('aplatit les sauts de ligne', () => {
    expect(normalizeComment('Ligne un\nLigne deux', MAX_COLUMN_COMMENT)).toBe('Ligne un Ligne deux')
  })

  it('tronque au-delà de la limite MariaDB sans couper au milieu du dernier mot', () => {
    const out = normalizeComment('mot '.repeat(400), 60)
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.endsWith('…')).toBe(true)
  })

  it('laisse intact un commentaire sous la limite', () => {
    expect(normalizeComment('court', MAX_COLUMN_COMMENT)).toBe('court')
  })

  // Vérifié en base : MariaDB stocke les métadonnées de commentaire dans un jeu de
  // caractères qui n'accepte pas les caractères hors BMP. Un `👍` posé ressort en `?`,
  // le commentaire relu ne correspond donc jamais à celui voulu et le script le
  // repostait à chaque exécution — idempotence rompue. On les retire à la source.
  it('retire les caractères hors BMP, que MariaDB ne sait pas stocker', () => {
    expect(normalizeComment('Avis 👍 = +1, 👎 = -1', MAX_COLUMN_COMMENT)).toBe('Avis = +1, = -1')
  })

  it('conserve les caractères BMP courants de la documentation française', () => {
    expect(normalizeComment('Flèche → tiret — accent é ⚠', MAX_COLUMN_COMMENT)).toBe(
      'Flèche → tiret — accent é ⚠'
    )
  })
})

describe('buildTableCommentSql', () => {
  it('utilise la syntaxe de table, sans MODIFY COLUMN', () => {
    expect(buildTableCommentSql('utilisateurs', '', 'Comptes SSO CJS')).toBe(
      "ALTER TABLE `utilisateurs` COMMENT = 'Comptes SSO CJS';"
    )
  })

  it('reste idempotent', () => {
    expect(buildTableCommentSql('utilisateurs', 'Comptes SSO CJS', 'Comptes SSO CJS')).toBeNull()
  })
})
