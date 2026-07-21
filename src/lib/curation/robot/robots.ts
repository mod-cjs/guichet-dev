/**
 * GUIC-597 — US-2 : lecture minimale de robots.txt (autorisation de chemin +
 * Crawl-delay). On sélectionne la section la plus spécifique pour notre user-agent
 * (nom exact prioritaire sur `*`), et on applique les règles `Disallow`/`Allow` par
 * préfixe. Volontairement simple : découverte de listings publics, pas un crawler
 * exhaustif. Un robots.txt vide/illisible → tout autorisé, sans délai.
 */

/** Plafond du Crawl-delay honoré : au-delà, une source gèlerait la file de veille. */
export const CRAWL_DELAY_MAX_MS = 30_000

export interface RobotsInfo {
  estAutorise(path: string): boolean
  crawlDelayMs: number | null
}

interface Regle {
  autorise: boolean
  prefixe: string
}

export function analyserRobots(txt: string, userAgent: string): RobotsInfo {
  const uaLower = userAgent.toLowerCase()
  // Regroupe les lignes par section user-agent.
  const sections: Array<{ agents: string[]; regles: Regle[]; crawlDelay: number | null }> = []
  let courante: (typeof sections)[number] | null = null
  let attendAgents = false

  for (const ligneBrute of txt.split(/\r?\n/)) {
    const ligne = ligneBrute.replace(/#.*$/, '').trim()
    if (!ligne) continue
    const sep = ligne.indexOf(':')
    if (sep === -1) continue
    const champ = ligne.slice(0, sep).trim().toLowerCase()
    const valeur = ligne.slice(sep + 1).trim()

    if (champ === 'user-agent') {
      if (!attendAgents || !courante) {
        courante = { agents: [], regles: [], crawlDelay: null }
        sections.push(courante)
      }
      courante.agents.push(valeur.toLowerCase())
      attendAgents = true
      continue
    }
    attendAgents = false
    if (!courante) continue
    if (champ === 'disallow') {
      if (valeur) courante.regles.push({ autorise: false, prefixe: valeur })
    } else if (champ === 'allow') {
      if (valeur) courante.regles.push({ autorise: true, prefixe: valeur })
    } else if (champ === 'crawl-delay') {
      const s = Number(valeur)
      // Plafonné : une source malveillante ne doit pas geler toute la file de veille.
      if (Number.isFinite(s) && s >= 0) courante.crawlDelay = Math.min(s * 1000, CRAWL_DELAY_MAX_MS)
    }
  }

  // Section applicable : match exact du nom prioritaire, sinon `*`.
  const propre = sections.find((s) => s.agents.some((a) => uaLower.includes(a) && a !== '*'))
  const generique = sections.find((s) => s.agents.includes('*'))
  const section = propre ?? generique ?? null

  return {
    crawlDelayMs: section?.crawlDelay ?? null,
    estAutorise(path: string) {
      if (!section) return true
      // Règle la plus longue (spécifique) l'emporte ; Allow > Disallow à longueur égale.
      let choisie: Regle | null = null
      for (const r of section.regles) {
        if (path.startsWith(r.prefixe)) {
          if (
            !choisie ||
            r.prefixe.length > choisie.prefixe.length ||
            (r.prefixe.length === choisie.prefixe.length && r.autorise)
          ) {
            choisie = r
          }
        }
      }
      return choisie ? choisie.autorise : true
    },
  }
}
