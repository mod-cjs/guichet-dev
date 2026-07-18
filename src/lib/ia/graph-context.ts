// Contextualisation de Yaye par le Knowledge Graph (spec 02 §0 — « un seul cerveau : le graphe »).
//
// Objectif recherche : dès le 1er tour, Yaye connaît la SITUATION du jeune telle que le graphe
// la voit (profil × opportunités) → orientation ACTIVE, pas seulement réactive. On réinjecte un
// résumé COMPACT dans le prompt système (comme la mémoire long terme), jamais récité tel quel.
//
// Traversées (lecture seule, RBAC borné à cjsUid, agrégats CDP) :
//  - offres ÉLIGIBLES au profil (niveau + expérience) ;
//  - sur la 1re, l'ÉCART de compétences + la FORMATION qui le comble (parcours — l'atout majeur) ;
//  - offres POPULAIRES chez des profils similaires (reco collaborative agrégée).
//
// Fail-soft total : toute erreur graphe → contexte vide (Yaye fonctionne sans).

import { getGraphPort } from './graph'
import { logger } from '@/lib/logger'

/** Préambule système qui réinjecte la lecture du graphe (sans la faire réciter). */
export const GRAPH_PREAMBLE =
  "Ce que le graphe de connaissances t'apprend sur SA situation (profil croisé aux opportunités). " +
  "Sers-t'en pour ORIENTER proactivement — proposer une offre qui lui colle, pointer une compétence " +
  "qui lui manque et la formation qui la développe — sans réciter ces lignes ni rien inventer au-delà :\n"

/**
 * Construit un contexte compact (quelques lignes) dérivé du graphe pour un bénéficiaire.
 * Renvoie '' si rien d'exploitable (nouveau profil, graphe indisponible…).
 */
export async function buildGraphContext(cjsUid: string): Promise<string> {
  try {
    const graph = getGraphPort()
    const [eligibles, recos] = await Promise.all([
      graph.eligibleOpportunites({ cjsUid }, 3).catch(() => []),
      graph.collaborativeReco({ cjsUid }, 3).catch(() => []),
    ])

    const lines: string[] = []

    if (eligibles.length > 0) {
      lines.push(`Offres qui collent à son profil (niveau + expérience) : ${eligibles.map(o => o.titre).join(' · ')}.`)
      // Parcours : écart de compétences sur la 1re offre + formation qui le comble.
      const gap = await graph.skillGap({ cjsUid }, eligibles[0].id).catch(() => null)
      if (gap && gap.manquantes.length > 0) {
        const manquantes = gap.manquantes.slice(0, 3).map(c => c.libelle).join(', ')
        const formation = gap.formations[0]?.titre
        lines.push(
          `Pour « ${eligibles[0].titre} », il lui manque : ${manquantes}` +
            (formation ? ` — la formation « ${formation} » les développe.` : '.'),
        )
      }
    }

    if (recos.length > 0) {
      lines.push(`Populaires chez des profils similaires au sien : ${recos.map(r => r.titre).join(' · ')}.`)
    }

    return lines.join('\n')
  } catch (err) {
    logger.warn('[graph-context] échec — contexte vide', { err: String(err) })
    return ''
  }
}
