/**
 * M13 / Data Hub — curseur d'extraction (lot 4, spec §8.2).
 *
 * POURQUOI PAS UN OFFSET
 * L'offset pagine par RANG, et le rang bouge. Une insertion pendant l'extraction décale
 * toutes les pages suivantes : une ligne passe entre deux pages sans jamais être lue, ou
 * se retrouve lue deux fois. Aucune erreur n'est levée — on découvre le trou des mois plus
 * tard en réconciliant des chiffres. Le curseur pagine par POSITION dans le tri
 * `(watermark, clé primaire)`, qui ne bouge pas.
 *
 * OPAQUE MAIS PAS SECRET — inutile de le signer : un curseur forgé ne donne accès qu'à des
 * données déjà autorisées pour la clé appelante. Ce qui compte est la validation stricte,
 * pour qu'un curseur malformé produise un refus net plutôt qu'un scan de table entière.
 */

/** Curseur invalide — distinct des autres erreurs pour que la route rende 400 et non 500. */
export class BadCursorError extends Error {
  constructor(raison: string) {
    super(`Curseur invalide : ${raison}`)
    this.name = 'BadCursorError'
  }
}

export interface Cursor {
  /** Watermark de la dernière ligne servie, ISO 8601 en précision milliseconde. */
  t: string
  /**
   * Clé primaire de la dernière ligne servie, toujours en chaîne. Les identifiants BigInt
   * dépassent les entiers sûrs de JavaScript : les porter en nombre les tronquerait.
   */
  i: string
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeCursor(raw: string): Cursor {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new BadCursorError('valeur absente')
  }
  // `Buffer.from` est permissif et ignore les caractères hors alphabet : sans ce contrôle,
  // « ### » se décoderait en chaîne vide et l'erreur serait attribuée au JSON.
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) {
    throw new BadCursorError('encodage attendu base64url')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    throw new BadCursorError('contenu illisible')
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadCursorError('objet attendu')
  }

  const { t, i } = parsed as Record<string, unknown>
  if (typeof t !== 'string') throw new BadCursorError('watermark absent')
  if (typeof i !== 'string') throw new BadCursorError('clé primaire absente')
  if (Number.isNaN(Date.parse(t))) throw new BadCursorError('watermark non daté')

  return { t, i }
}
