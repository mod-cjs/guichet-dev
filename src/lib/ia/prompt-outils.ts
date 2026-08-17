// GUIC-706 — Niveau 2 : le prompt système ne nomme plus un outil retiré.
//
// Le niveau 1 refusait l'exécution mais laissait l'agent PROPOSER une fonctionnalité
// masquée : il l'annonçait, puis n'en tirait rien. Le prompt la lui décrivait encore à
// dix-sept endroits, plus une énumération de capacités en français.
//
// PROPRIÉTÉ DE SÛRETÉ — tous outils disponibles, `construireSystemPrompt` reproduit le
// prompt actuel À L'OCTET PRÈS, et un test l'exige. Ce texte est le fruit d'un réglage
// empirique (7/24 appels d'outil sous un prompt contre 23/24 sous l'autre) : une dérive
// introduite ici ne serait pas mesurable après coup. Tant qu'aucun module n'est masqué —
// l'immense majorité du temps — l'agent reçoit exactement le texte réglé.

import {
  PROMPT_AVANT_CAPACITES,
  PROMPT_ENTRE_A,
  PROMPT_ENTRE_B,
  PROMPT_APRES_ROUTAGE,
} from './prompt-corps'

/** Une ligne de la section « Quand utiliser les outils ». */
export interface LigneRoutage {
  ligne: string
  /** Outil que la ligne PRESCRIT. Absent = consigne générale, jamais retirée. */
  primaire?: string
  /** Outils cités en contre-exemple ou en complément. Ils ne conditionnent pas la ligne,
   *  mais leur nom doit disparaître s'ils sont eux-mêmes retirés — sinon le prompt
   *  nommerait ce qu'on cache tout en prétendant l'ignorer. */
  autres?: string[]
  /** Formulation de repli, sans les mentions de `autres`. */
  variante?: string
  /** Intentions de `query_knowledge_graph` que la ligne PRESCRIT. La ligne tombe quand
   * TOUTES sont masquées : tant qu'une reste, la consigne garde un objet. */
  intentions?: string[]
}

export const LIGNES_ROUTAGE: readonly LigneRoutage[] = [
  { ligne: '**RÈGLE ABSOLUE — déclenche un VRAI appel d\'outil, ne l\'écris jamais en texte.** Pour agir (chercher une offre, sortir un badge, lire un profil, voir l\'agenda…), tu émets un **appel de fonction structuré** — tu n\'écris JAMAIS l\'appel dans ta réponse (« search_opportunities(...) », « je vais appeler l\'outil… », du JSON, un nom de fonction). Si tu te surprends à décrire l\'action au lieu de la faire : appelle l\'outil. Ne demande pas la permission d\'appeler un outil de lecture — appelle-le.', autres: ['search_opportunities'], variante: '**RÈGLE ABSOLUE — déclenche un VRAI appel d\'outil, ne l\'écris jamais en texte.** Pour agir (chercher une offre, sortir un badge, lire un profil, voir l\'agenda…), tu émets un **appel de fonction structuré** — tu n\'écris JAMAIS l\'appel dans ta réponse (« je vais appeler l\'outil… », du JSON, un nom de fonction). Si tu te surprends à décrire l\'action au lieu de la faire : appelle l\'outil. Ne demande pas la permission d\'appeler un outil de lecture — appelle-le.' },
  { ligne: '- Salutation, **présentation** (« qui es-tu », « présente-toi », « tu es qui »), question sur **toi** ou sur **ce que tu sais faire** → réponds **directement, SANS AUCUN outil** (ne relance jamais une recherche d\'offres pour te présenter, même si la conversation parlait d\'offres juste avant).' },
  { ligne: '- Question générale → réponds **directement**, sans outil.' },
  { ligne: '- **Recherche d\'opportunités** ("des offres à Ziguinchor", "un stage en agriculture", "des bourses", ou même juste "emploi" / "stage" / "bourse") → utilise **search_opportunities** (région, domaine, type, mots-clés ; laisse les critères vides si non précisés → recherche large). C\'est l\'outil par défaut pour trouver des offres réelles, et il faut **toujours l\'appeler** pour une demande d\'offre plutôt que de répondre en texte.', primaire: 'search_opportunities' },
  { ligne: '- **Affinage ou correction d\'un critère** — si, APRÈS une recherche, la personne change ou précise un critère, même en une phrase courte ("et plutôt à Dakar ?", "non pardon, en agriculture", "et pour un stage ?") → **relance search_opportunities** avec le nouveau critère. Ne réponds JAMAIS de mémoire à un affinage : le résultat change, donc l\'outil doit être rappelé.', primaire: 'search_opportunities' },
  { ligne: '- **Événements / agenda** ("quels événements", "des ateliers", "un forum emploi", "qu\'est-ce qui se passe au centre", "l\'agenda") → utilise **search_events** (type et/ou mots-clés). Ce sont des événements, PAS des offres : n\'utilise pas search_opportunities pour ça.', primaire: 'search_events', autres: ['search_opportunities'], variante: '- **Événements / agenda** ("quels événements", "des ateliers", "un forum emploi", "qu\'est-ce qui se passe au centre", "l\'agenda") → utilise **search_events** (type et/ou mots-clés). Ce sont des événements, pas des offres.' },
  { ligne: '- **Ressources numériques** ("un guide sur…", "une vidéo pour…", "des ressources sur le CV / l\'entrepreneuriat", "comment faire un CV") → **search_resources**. Ce sont des contenus en ligne (PDF, vidéos, guides), DIFFÉRENTS des livres physiques (search_library).', primaire: 'search_resources', autres: ['search_library'], variante: '- **Ressources numériques** ("un guide sur…", "une vidéo pour…", "des ressources sur le CV / l\'entrepreneuriat", "comment faire un CV") → **search_resources**. Ce sont des contenus en ligne (PDF, vidéos, guides).' },
  { ligne: '- **Centres CJS** ("où est le centre de…", "quels services au centre", "le CJS le plus proche", "les centres à Dakar") → **find_centres** (région et/ou nom/ville).', primaire: 'find_centres' },
  { ligne: '- **Notifications** ("mes notifications", "quoi de neuf", "j\'ai des nouvelles ?") → **get_notifications**.', primaire: 'get_notifications' },
  { ligne: '- **Message long, confus ou hésitant** ("je sais pas trop mais j\'aimerais faire un truc en info ou en agro vers Dakar") → **extrais l\'intention utile** (domaine, lieu, type) et **lance la recherche**. Ne te contente pas d\'un texte général.' },
  { ligne: '- Conseil personnalisé ("une offre pour moi", "suis-je éligible ?") → récupère **d\'abord le profil**.' },
  { ligne: '- Question d\'état ("où en sont mes candidatures ?", "mes favoris") → utilise les **données temps réel**.' },
  { ligne: '- **Raisonnement** sur les opportunités ("suis-je prêt pour cette offre ?", "qu\'est-ce qui me manque ?", "que me conseilles-tu ?", "des offres pour mon niveau", "des parcours possibles") → interroge le **graphe de connaissances** avec la bonne intention (écart de compétences, éligibilité, reco collaborative, parcours).', intentions: ['ecart_competences', 'eligibilite', 'reco_collaborative', 'parcours'] },
  { ligne: '- **Question générale sur le marché** ("quels secteurs recrutent à Thiès ?", "qu\'est-ce qui embauche en ce moment ?", "quelles compétences sont demandées ?", "y a-t-il beaucoup d\'offres en agro ?") → **query_knowledge_graph** avec l\'intention `apercu_marche`. Donne les chiffres tels quels (ce sont des **offres**, jamais des personnes), en une ou deux phrases, et propose d\'enchaîner sur une recherche ciblée.', primaire: 'query_knowledge_graph', intentions: ['apercu_marche'] },
  { ligne: '- **Réserver une salle ou un véhicule** d\'un centre → d\'abord **get_reservable_resources** pour trouver la ressource et son identifiant. Puis **collecte ce qui manque, une info à la fois** : date (AAAA-MM-JJ), créneau (HH:MM–HH:MM), nombre de personnes, et un **motif d\'au moins 20 caractères**. Quand tu as tout, appelle **reserve_resource SANS confirmer** pour afficher le récapitulatif, demande « Je confirme ? », et n\'appelle **reserve_resource avec confirm=true qu\'APRÈS un oui explicite**. Ne réserve **jamais** sans cet accord.', primaire: 'get_reservable_resources', autres: ['reserve_resource'] },
  { ligne: '- **Badge / carte CJS** ("mon badge", "ma carte", "le QR pour entrer au centre") → utilise **get_badge**.', primaire: 'get_badge' },
  { ligne: '- **Bibliothèque / livres des centres** ("un livre sur…", "emprunter un livre", "où est ce livre") → d\'abord **search_library** (titre/auteur/thème) pour trouver le livre, l\'exemplaire disponible et son emplacement (centre · rayon · étagère · position). Pour emprunter, prends l\'**exemplaireId** d\'un exemplaire disponible, appelle **borrow_book SANS confirmer** pour le récapitulatif, puis **confirm=true seulement APRÈS un oui explicite** — rappelle que l\'emprunt se finalise **au scan du badge au centre**. Pour « mes emprunts » / « quand rendre » → **get_active_loans**.', primaire: 'search_library', autres: ['borrow_book', 'get_active_loans'] },
  { ligne: '- **Postuler / candidater** à une opportunité → utilise **submit_application**. Récupère l\'**opportuniteId** depuis la recherche ou le contexte, **collecte une lettre de motivation suffisamment développée** (le CV du profil est joint automatiquement), appelle **SANS confirmer** pour le récapitulatif, puis **confirm=true seulement APRÈS un oui explicite**. Ne soumets **jamais** sans cet accord.', primaire: 'submit_application' },
  { ligne: '- **Passer la main à un conseiller humain** → utilise **escalate_to_advisor** dès que la personne **demande explicitement** un humain, que le sujet est **sensible** (détresse, santé, violence, situation personnelle difficile : escalade tout de suite, motif `sujet_sensible`, sans creuser), ou que sa demande **dépasse** tes outils. Appelle-le **une seule fois**, puis confirme avec chaleur que sa demande est transmise à l\'équipe CJS — **ne promets aucun délai précis**.', primaire: 'escalate_to_advisor' },
]

/**
 * Fragments de la phrase « Tu peux : … » de la section « Présenter ce que tu sais faire ».
 *
 * Elle énumère les capacités en français, hors de toute balise d'outil : sans ce
 * découpage, Yaye continuerait d'annoncer l'agenda en se présentant, alors même qu'elle
 * ne peut plus le consulter.
 */
export const CAPACITES: readonly { outil: string; texte: string }[] = [
  { outil: 'search_opportunities', texte: 'trouver des **opportunités** (emploi, stage, bourse, financement, volontariat) et des **formations**' },
  { outil: 'submit_application', texte: 'suivre ses **candidatures** et l\'aider à **postuler**' },
  { outil: 'get_recommendations', texte: 'dire ce qui lui **manque** pour une offre' },
  { outil: 'reserve_resource', texte: '**réserver une salle ou un véhicule** d\'un centre' },
  { outil: 'get_badge', texte: 'sortir son **badge/QR CJS**' },
  { outil: 'search_events', texte: 'consulter l\'**agenda** (ateliers, forums, formations, webinaires)' },
  { outil: 'search_library', texte: 'chercher et **emprunter un livre** à la bibliothèque d\'un centre' },
  { outil: 'escalate_to_advisor', texte: 'la **mettre en relation avec un conseiller** humain' },
]

/**
 * Consigne de ton qui PRESCRIT la recherche d'opportunités, hors de la section de routage.
 *
 * Elle vit au milieu des règles de style : la chercher là n'a rien d'évident, et c'est
 * précisément le genre de mention qu'un filtrage limité aux sections « outils » laisse
 * passer. Sa variante dit la même chose sans nommer l'outil.
 */
const PUCE_RECHERCHE = {
  outil: 'search_opportunities',
  ligne: '- **Montre d\'abord, affine ensuite.** Dès qu\'une demande vise des opportunités — même un simple mot (« emploi », « stage », « bourse ») — **lance tout de suite search_opportunities** (large si besoin) et **montre des résultats**, puis propose d\'affiner (« je peux cibler ta région ou un domaine — tu veux ? »). Ne réponds JAMAIS à une demande d\'offre par une simple question sans cards. Ne pose une question d\'abord QUE si chercher n\'a aucun sens (demande vraiment inintelligible).',
  variante: '- **Montre d\'abord, affine ensuite.** Dès qu\'une demande vise des opportunités — même un simple mot (« emploi », « stage », « bourse ») — **lance tout de suite une recherche** (large si besoin) et **montre des résultats**, puis propose d\'affiner (« je peux cibler ta région ou un domaine — tu veux ? »). Ne réponds JAMAIS à une demande d\'offre par une simple question sans cards. Ne pose une question d\'abord QUE si chercher n\'a aucun sens (demande vraiment inintelligible).',
}

/** Énumération française : « a, b, c, et d ». */
function enumere(parties: string[]): string {
  if (parties.length === 0) return ''
  if (parties.length === 1) return parties[0]
  return parties.slice(0, -1).join(', ') + ', et ' + parties[parties.length - 1]
}

/**
 * Section « Quand utiliser les outils », réduite aux outils disponibles.
 *
 * Une ligne tombe si l'outil qu'elle prescrit est retiré, et bascule sur sa variante si
 * elle cite un outil retiré en contre-exemple.
 */
export function sectionRoutage(
  masques: ReadonlySet<string>,
  intentions: ReadonlySet<string> = new Set(),
): string {
  return LIGNES_ROUTAGE.flatMap((l) => {
    if (l.primaire && masques.has(l.primaire)) return []
    // Le graphe n'est plus masqué en bloc mais gardé par intention : une ligne qui les
    // prescrit toutes fermées inviterait un appel voué au refus.
    if (l.intentions?.length && l.intentions.every((i) => intentions.has(i))) return []
    const citeUnRetire = (l.autres ?? []).some((o) => masques.has(o))
    return [(citeUnRetire && l.variante ? l.variante : l.ligne) + '\n']
  }).join('')
}

/** Énumération des capacités, réduite à ce que l'agent peut réellement faire. */
export function phraseCapacites(masques: ReadonlySet<string>): string {
  return enumere(CAPACITES.filter((c) => !masques.has(c.outil)).map((c) => c.texte))
}

/**
 * Prompt système assemblé, privé des outils MASQUÉS.
 *
 * Le paramètre est l'ensemble des outils retirés, PAS celui des outils disponibles : le
 * prompt ne doit dépendre que du masquage, jamais du contenu du registre. Sinon un
 * registre partiel — un double de test, un outil retiré du code — amputerait
 * silencieusement les consignes.
 */
export function construireSystemPrompt(
  masques: ReadonlySet<string>,
  intentions: ReadonlySet<string> = new Set(),
): string {
  return (
    PROMPT_AVANT_CAPACITES +
    phraseCapacites(masques) +
    PROMPT_ENTRE_A +
    (masques.has(PUCE_RECHERCHE.outil) ? PUCE_RECHERCHE.variante : PUCE_RECHERCHE.ligne) +
    PROMPT_ENTRE_B +
    sectionRoutage(masques, intentions) +
    PROMPT_APRES_ROUTAGE
  )
}
