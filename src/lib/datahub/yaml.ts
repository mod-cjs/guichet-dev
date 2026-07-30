/**
 * M13 / Data Hub — émetteur YAML minimal, sans dépendance.
 *
 * POURQUOI PAS UNE BIBLIOTHÈQUE — `js-yaml` n'est présent qu'en dépendance transitive :
 * s'appuyer dessus, c'est dépendre de l'arbre de dépendances d'un autre paquet, qui peut
 * disparaître à la prochaine montée de version. Les scalaires sont donc cités via
 * `JSON.stringify`, JSON étant un sous-ensemble de YAML 1.2 : l'échappement est correct
 * par construction, y compris pour les apostrophes et les deux-points omniprésents dans
 * la documentation française.
 *
 * Partagé par les deux contrats publiés — OpenAPI et sources dbt — pour qu'ils ne puissent
 * pas diverger sur la forme.
 */

export type YamlValue =
  | string
  | number
  | boolean
  | null
  | YamlValue[]
  | { [key: string]: YamlValue }

const KEY_NU = /^[A-Za-z_][A-Za-z0-9_]*$/

function emitKey(key: string): string {
  return KEY_NU.test(key) ? key : JSON.stringify(key)
}

export function emitYaml(value: YamlValue, indent = 0): string {
  const pad = '  '.repeat(indent)

  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    // La première clé d'un objet en liste se place juste après le tiret ; les suivantes
    // s'alignent dessous, d'où le rendu à `indent + 1`. Retirer seulement le saut de
    // ligne laisserait l'indentation du rendu et désalignerait le mapping — YAML invalide.
    return value
      .map((item) => `\n${pad}- ${emitYaml(item, indent + 1).replace(/^\n\s*/, '')}`)
      .join('')
  }

  const entries = Object.entries(value)
  if (entries.length === 0) return '{}'
  return entries
    .map(([k, v]) => {
      const rendu = emitYaml(v, indent + 1)
      const scalaire = !rendu.startsWith('\n')
      return `\n${pad}${emitKey(k)}:${scalaire ? ` ${rendu}` : rendu}`
    })
    .join('')
}

/** Document complet : sans le saut de ligne initial, avec un saut final. */
export function renderYamlDocument(value: YamlValue, entete = ''): string {
  return `${entete}${emitYaml(value).replace(/^\n/, '')}\n`
}
