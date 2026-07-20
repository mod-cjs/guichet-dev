// Récupération des appels d'outils émis EN TEXTE par les modèles qui ne remplissent pas
// toujours le champ structuré `tool_calls`. Formats réels observés/connus sur les modèles
// ouverts (Llama, Gemma, Mistral via MaaS) :
//   • forme fonctionnelle : search_opportunities(type="Emploi", region="Thiès")
//   • balise Llama        : <|python_tag|>get_badge()  · <function=find_centres>{...}</function>
//   • forme JSON          : {"name":"search_opportunities","arguments":{...}}  · [ {...}, {...} ]
//
// Sans ce parseur, l'agent jette un appel VALIDE (mal formaté) et retombe sur un fallback.
// Pur, déterministe, CONSERVATEUR (n'invente jamais un appel à partir de prose) → testable en CI.
//
// v2 (étude tool-calling) : renvoie PLUSIEURS appels (`parseTextToolCalls`) — un modèle faible
// peut émettre 2 appels en texte dans un même message — et signale les noms d'outils TENTÉS mais
// INCONNUS (ex. `get_library` au lieu de `search_library`) pour que la boucle corrige le modèle
// au lieu de jeter l'appel en silence. `parseTextToolCall` (singulier) reste dispo (1er appel).

export interface ParsedCall {
  name: string
  args: Record<string, unknown>
}

export interface ParseResult {
  /** Appels valides (nom d'outil connu), dans l'ordre d'apparition. */
  calls: ParsedCall[]
  /** Noms d'outils manifestement TENTÉS mais inconnus (pour renvoyer une correction au modèle). */
  unknown: string[]
}

const NAME_KEYS = ['name', 'tool', 'function', 'tool_name', 'recipient_name']
const ARG_KEYS = ['arguments', 'parameters', 'args', 'params', 'input']

function coerce(raw: string): unknown {
  const v = raw.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null' || v === 'None') return null
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
}

/** Parse l'intérieur des parenthèses : JSON `{...}`, kwargs `k="v", k2=3`, ou vide. */
function parseArgs(inner: string): Record<string, unknown> {
  const s = inner.trim()
  if (!s) return {}
  if (s.startsWith('{')) {
    try {
      const j = JSON.parse(s)
      if (j && typeof j === 'object' && !Array.isArray(j)) return j as Record<string, unknown>
    } catch {
      /* pas du JSON → kwargs */
    }
  }
  const out: Record<string, unknown> = {}
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) out[m[1]] = coerce(m[2])
  return out
}

/** Extrait { name, args } d'un objet JSON de type appel d'outil, ou null. */
function fromJsonObject(j: unknown, knownNames: string[]): ParsedCall | null {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null
  const obj = j as Record<string, unknown>
  const nameKey = NAME_KEYS.find((k) => typeof obj[k] === 'string' && knownNames.includes(obj[k] as string))
  if (!nameKey) return null
  const argKey = ARG_KEYS.find((k) => obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k]))
  return { name: obj[nameKey] as string, args: argKey ? (obj[argKey] as Record<string, unknown>) : {} }
}

/** Retire les enveloppes de format (balises, fences) autour d'un appel. */
function stripWrappers(content: string): string {
  return content
    .trim()
    .replace(/<\|python_tag\|>/g, '')
    .replace(/^\[TOOL_CALLS\]\s*/i, '')
    .replace(/<\/?(?:tool_call|function_call|tools?|tool_code)>/gi, '')
    .replace(/^```(?:json|python|tool_code)?\s*|\s*```$/g, '')
    .trim()
}

/**
 * Scanne les formes fonctionnelles `nom(...)` en ÉQUILIBRANT les parenthèses — gère les args JSON
 * imbriqués `nom({"a":1})` et plusieurs appels dans le même texte. Ne matche que `nom(` : un simple
 * nom d'outil cité en prose (sans parenthèse) n'est jamais pris pour un appel (conservateur).
 */
function scanFunctional(t: string): { name: string; inner: string }[] {
  const out: { name: string; inner: string }[] = []
  const nameRe = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = nameRe.exec(t))) {
    let depth = 1
    let i = m.index + m[0].length
    for (; i < t.length && depth > 0; i++) {
      const ch = t[i]
      if (ch === '(') depth++
      else if (ch === ')') depth--
    }
    if (depth === 0) {
      out.push({ name: m[1], inner: t.slice(m.index + m[0].length, i - 1) })
      nameRe.lastIndex = i
    }
  }
  return out
}

/** Un token ressemble à un nom d'outil s'il est en snake_case (les vrais outils le sont). */
function looksLikeToolName(name: string): boolean {
  return name.includes('_')
}

/**
 * Nom d'outil connu le plus proche d'un nom tenté (générique, par recouvrement de segments +
 * distance) — pour corriger `get_library` → `search_library`. Renvoie null si rien de proche.
 * Générique (pas de table codée en dur → pas d'overfitting).
 */
// Préfixes verbe génériques : partagés par beaucoup d'outils, ils ne discriminent pas
// (get_library ≟ get_badge). On ne score QUE sur les segments de CONTENU.
const GENERIC_VERBS = new Set(['get', 'search', 'find', 'list', 'query', 'fetch', 'load'])

export function nearestToolName(attempted: string, knownNames: string[]): string | null {
  const content = (name: string) => name.toLowerCase().split('_').filter((s) => s && !GENERIC_VERBS.has(s))
  const segs = content(attempted)
  let best: string | null = null
  let bestScore = 0
  for (const known of knownNames) {
    const kSegs = content(known)
    const shared = segs.filter((s) => kSegs.includes(s)).length
    if (shared > bestScore) {
      bestScore = shared
      best = known
    }
  }
  // Au moins un segment de CONTENU en commun (ex. "library" partagé).
  return bestScore >= 1 ? best : null
}

/** Dédup par nom + args sérialisés (deux modèles répètent parfois le même appel). */
function dedup(calls: ParsedCall[]): ParsedCall[] {
  const seen = new Set<string>()
  const out: ParsedCall[] = []
  for (const c of calls) {
    const key = c.name + '::' + JSON.stringify(c.args)
    if (!seen.has(key)) {
      seen.add(key)
      out.push(c)
    }
  }
  return out
}

/**
 * Détecte TOUS les appels d'outils formatés en texte dans `content`. Conservateur : le nom doit
 * être un outil connu (sinon rangé dans `unknown` s'il ressemble à un nom d'outil). Ne confond pas
 * de la prose contenant un nom d'outil (sans parenthèses ni JSON) avec un appel.
 */
export function parseTextToolCalls(content: string | null | undefined, knownNames: string[]): ParseResult {
  const calls: ParsedCall[] = []
  const unknown: string[] = []
  if (!content) return { calls, unknown }
  const t = stripWrappers(content)

  // 1. Balises Llama : <function=nom>{args}</function> (plusieurs possibles).
  const xmlRe = /<function\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*>([\s\S]*?)<\/function>/g
  let xm: RegExpExecArray | null
  while ((xm = xmlRe.exec(t))) {
    if (knownNames.includes(xm[1])) calls.push({ name: xm[1], args: parseArgs(xm[2]) })
    else if (looksLikeToolName(xm[1])) unknown.push(xm[1])
  }

  // 2. JSON : objet unique {"name":...} ou tableau [ {...}, {...} ].
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const j = JSON.parse(t)
      const arr = Array.isArray(j) ? j : [j]
      for (const el of arr) {
        const c = fromJsonObject(el, knownNames)
        if (c) calls.push(c)
        else if (el && typeof el === 'object') {
          const nm = NAME_KEYS.map((k) => (el as Record<string, unknown>)[k]).find((v) => typeof v === 'string') as string | undefined
          if (nm && looksLikeToolName(nm) && !knownNames.includes(nm)) unknown.push(nm)
        }
      }
    } catch {
      /* pas du JSON valide → on tente la forme fonctionnelle ci-dessous */
    }
  }

  // 3. Forme fonctionnelle nom(args), potentiellement plusieurs, éventuellement noyée en prose.
  for (const { name, inner } of scanFunctional(t)) {
    if (knownNames.includes(name)) calls.push({ name, args: parseArgs(inner) })
    else if (looksLikeToolName(name)) unknown.push(name)
  }

  return { calls: dedup(calls), unknown: [...new Set(unknown)].filter((u) => !calls.some((c) => c.name === u)) }
}

/**
 * Compat : renvoie le PREMIER appel valide détecté, ou null. Conserve la sémantique historique
 * pour les appelants qui n'ont besoin que d'un appel.
 */
export function parseTextToolCall(content: string | null | undefined, knownNames: string[]): ParsedCall | null {
  return parseTextToolCalls(content, knownNames).calls[0] ?? null
}
