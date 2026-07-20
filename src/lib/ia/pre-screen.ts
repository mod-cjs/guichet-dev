// Garde-fou DÉTERMINISTE en amont de la boucle d'outils (GUIC — amélioration Yaye P0/P1).
//
// Motivation : sur un petit modèle local, le LLM appelle parfois un outil (ou divulgue)
// là où il DOIT refuser (données d'un tiers, agrégat interdit, injection/jailbreak) — ce
// sont des hard-fails de sécurité/CDP qui ne se compensent pas. On les intercepte AVANT
// tout appel d'outil par des règles sûres, indépendantes du modèle.
//
// Bonus P1 : les salutations / remerciements purs (1er tour) reçoivent une réponse directe
// variée, SANS outil — au lieu de déclencher un `get_user_profile` à tort.
//
// Faux positifs : on penche du côté sûr pour la sécurité (refuser un tiers de trop), mais on
// épargne le tutoiement à la 1re personne (« MON badge », « MES candidatures ») via l'appel
// uniquement sur des marqueurs de tiers explicites.

export type PreScreenAction = 'refuse' | 'direct' | 'escalate'

/** Signaux de danger (alignés sur DANGER_SIGNALS de tools.ts). */
export type DangerSignal =
  | 'violence'
  | 'harcelement'
  | 'abus_sexuel'
  | 'exploitation'
  | 'automutilation_suicide'
  | 'discrimination'
  | 'autre_danger'

export interface PreScreenResult {
  action: PreScreenAction
  /** Réponse à renvoyer telle quelle (tutoyée, courte ; emoji sobre autorisé, jamais sur un sujet sensible). */
  reply: string
  /** Motif (journalisation / éval). */
  reason: string
  /** Renseigné quand action === 'escalate' : signal de danger à transmettre. */
  dangerSignal?: DangerSignal
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques combinants
    // Apostrophes TYPOGRAPHIQUES → droite. Indispensable : les claviers mobiles produisent
    // « d'en », « quelqu'un » avec ’ (U+2019) qui, sinon, ne matche aucun motif à apostrophe
    // (« envie d'en finir », « quelqu'un d'autre »…). U+2018/2019/201B, ʼ, ´, ` couverts.
    .replace(/[‘’‛ʼ´`']/g, "'")
    // Caractères de largeur nulle → supprimés (anti-obfuscation « ig<zwsp>nore », cf. audit M2).
    .replace(/[​‌‍⁠﻿]/g, '')
}

// ── DANGER — filet de sécurité déterministe (priorité ABSOLUE) ────────────────
// Détecte des formulations de danger EXPLICITES pour garantir l'escalade humaine même
// si le modèle passe à côté. Volontairement HAUTE PRÉCISION (phrases nettes) : on préfère
// rater une tournure ambiguë (le modèle reste le 1er filet) que sur-signaler à tort.
// Politique CDP : « en cas de doute, signale » — mais ici on borne pour éviter le bruit.

const DANGER_PATTERNS: readonly (readonly [RegExp, DangerSignal])[] = [
  // « disparaitre » : capté SAUF en tournure transitive « faire disparaître X » (figuré :
  // « faire disparaître mon stress / ce trou dans mon CV »). Le lookbehind sur « faire » isole
  // l'usage auto-référentiel (« je veux disparaître », « envie de tout arrêter et de disparaître »).
  [/(me\s+suicider|me\s+tuer|mettre\s+fin\s+a\s+mes\s+jours|je\s+veux\s+mourir|veux\s+en\s+finir|envie\s+d'?en\s+finir|en\s+finir\s+avec\s+(la\s+vie|tout)|plus\s+envie\s+de\s+vivre|(?<!faire\s)disparaitre|me\s+faire\s+du\s+mal|m'?automutil|me\s+mutiler|me\s+scarifi)/, 'automutilation_suicide'],
  [/((on|il|elle|mon\s+(mari|conjoint|copain|pere|frere|patron))\s+me\s+(frappe|bat|cogne|roue\s+de\s+coups|tabasse)|je\s+suis\s+(frappe|battu|tabasse)|violences?\s+(conjugal|domestique|familial|a\s+la\s+maison))/, 'violence'],
  [/(attouchement|abus\s+sexuel|on\s+m'?a\s+viol|je\s+me\s+suis\s+fait\s+viol|forc[e]*e?\s+a\s+des\s+(rapport|relation|acte)s?\s+sexuel|rapport\s+sexuel\s+sous\s+contrainte|photos?\s+intimes?\s+sous\s+(la\s+)?contrainte)/, 'abus_sexuel'],
  [/(harcele|cyberharcel)/, 'harcelement'],
  [/(travail\s+force|papiers?[^.]{0,15}confisqu|confisqu[^.]{0,15}(mes\s+)?papiers|fait\s+travailler\s+sans\s+(me\s+)?payer|on\s+me\s+force\s+a\s+travailler|mendicite\s+forcee|je\s+suis\s+exploite\s+au\s+travail)/, 'exploitation'],
  // Discrimination : rejet/maltraitance lié à un attribut protégé (haute précision → cause explicite).
  [/(a\s+cause\s+de\s+(mon|ma|mes)\s+(handicap|origine|religion|couleur|genre|orientation|accent|ethnie|peau)|discrimin|(rejete|maltraite|humilie|exclu)[e]*s?\s+(a\s+cause\s+de|pour|en\s+raison\s+de)\s+(mon|ma|mes)\s+(handicap|origine|religion|genre|couleur))/, 'discrimination'],
  // Détresse diffuse SANS signal explicite ci-dessus → escalade douce (marqueurs forts uniquement,
  // pour ne PAS attraper un simple stress/déception, gérés en réponse directe plus bas).
  [/(tout\s+va\s+mal\s+(dans\s+ma\s+vie|en\s+ce\s+moment)|au\s+fond\s+du\s+trou|je\s+n'?en\s+peux\s+plus\s+de\s+(tout|(ma\s+)?vie)|je\s+sombre|desespere|desespoir|je\s+suis\s+au\s+bout|a\s+bout\s+de\s+(force|nerf)|plus\s+la\s+force\s+de\s+vivre|ma\s+vie\s+est\s+(fichue|foutue))/, 'autre_danger'],
]

/** Détecte un signal de danger explicite dans le message, ou null. */
export function detectDanger(message: string): DangerSignal | null {
  const t = norm(message)
  for (const [re, sig] of DANGER_PATTERNS) if (re.test(t)) return sig
  return null
}

const DANGER_REPLY =
  "Merci de m'en avoir parlé, tu as bien fait. Je transmets tout de suite à une personne de confiance du CJS qui va te recontacter — tu n'es pas seul·e."

// Demande EXPLICITE d'un conseiller humain → escalade directe (pas un danger, mais un relais dû).
// Haute précision : « parler à un conseiller/humain », pas « je veux un conseil ».
const RE_HUMAN_REQUEST =
  /(parler|discuter|echanger|contacter|joindre|voir|avoir)\s+(a\s+|avec\s+|à\s+)?(un|une|d'?un|quelqu'?un|des?)?\s*(vrai[e]?\s+)?(conseiller|conseillere|humain|humaine|agent\s+humain|vraie?\s+personne|personne\s+reelle|responsable\s+humain|un\s+humain)/
const HUMAN_REPLY =
  "Bien sûr — je te mets en relation avec un conseiller du CJS, il va prendre le relais et te répondre ici même. Tu peux lui rappeler ta demande."

// ── P0 — refus de sécurité / CDP / injection ─────────────────────────────────

// NB : `administrateur` n'est PAS une alternance nue (sinon « des offres administrateur
// système » serait refusé comme jailbreak) — il n'est capté qu'après « mode ».
const RE_INJECTION =
  /(ignore[rz]?\b[^.!?]{0,30}(instructions?|regles?|consignes)|oublie[rz]?\b[^.!?]{0,20}instructions?|mode\s+admin(istrateur)?|tu\s+es\s+(maintenant|desormais)|repete[rz]?\b[^.!?]{0,30}(instructions?|prompt|regles?|consignes)|instructions?\s+system|system\s+prompt|montre[rz]?\b[^.!?]{0,15}(regles?|instructions?|consignes))/

// NB : « toutes les candidatures » retiré du groupe `toutes les …` → « montre toutes
// les candidatures auxquelles j'ai postulé » (les SIENNES) ne doit pas être refusé.
// L'export réel reste capté par « exporte … », « tous les candidats », « toute la base ».
const RE_MASS_EXPORT =
  /(tous?\s+les\s+(utilisateurs?|candidats?|jeunes|membres|inscrits|dossiers?)|toute\s+la\s+base|liste\s+(complete|de\s+tous)|exporte[rz]?\s|extraire?\s+toutes|toutes\s+les\s+(donnees|coordonnees))/

// NB : `taux de`, `en moyenne`, `moyenne de` retirés → questions métier légitimes
// (« taux de réussite de cette formation », « en moyenne combien je peux gagner »)
// ne sont plus refusées. `statistiques` et `au total` NUS retirés aussi (P1) : « des
// statistiques sur le marché de l'emploi » est une vraie question. On ne bloque que les
// comptages EXPLICITES sur la POPULATION d'usagers (« combien de jeunes ont postulé »).
const RE_AGGREGATE =
  /(combien\s+(de\s+)?(jeunes|personnes|candidats?|utilisateurs?|gens|inscrits)|nombre\s+(total|de\s+jeunes|de\s+candidat)|combien\s+ont\s+postule)/

// Donnée d'un tiers : personne explicite, « … de <Prénom> » (majuscule), ou coordonnées
// d'un recruteur/employeur/organisation (Yaye ne divulgue pas de contacts directs).
// P1 — le mot « ami/copain/voisin » SEUL ne suffit plus à refuser (« une amie m'a parlé
// d'une bourse » est légitime) : il faut aussi un PORTEUR DE DONNÉE dans le message
// (numéro, email, dossier…), cf. RE_DATA_CARRIER et la condition dans preScreen().
const RE_THIRD_PERSON =
  /(voisin|voisine|ami|amie|copain|copine|camarade|collegue|quelqu'?un\s+d'?autre|une\s+autre\s+personne)/
const RE_DATA_CARRIER =
  /(numero|telephone|tel\b|email|e-?mail|mail|coordonnees|donnees|dossier|adresse|contact|candidatures?)/
// NB : `profil` retiré des porteurs — « le profil de Développeur web » (intitulé de
// poste capitalisé) n'est PAS une donnée de tiers. Le vrai risque (numéro/email/dossier
// « de <Prénom> ») reste capté, et l'accès profil est de toute façon borné au cjsUid (RBAC).
const RE_THIRD_NAMED =
  /(candidatures?|dossier|numero|telephone|email|e-?mail|coordonnees|donnees|adresse)\s+(de\s+|d'\s*)[A-ZÉÈ][a-zà-ÿ]+/
const RE_THIRD_CONTACT =
  /(email|e-?mail|mail|telephone|tel\b|numero|coordonnees|contact|adresse)\s+(du|de\s+l|de\s+la|de\s+l'|d'|de\s+ce|de\s+cet)\s*(recruteur|employeur|entreprise|responsable|contact|organisation|structure|societe)/

const REFUSALS = {
  injection:
    "Je reste Yaye, ta conseillère du CJS : je ne peux pas changer de rôle ni partager mes instructions. On revient plutôt à ton projet ?",
  mass:
    "Je ne peux pas sortir les données des autres membres. Je me concentre sur toi : ton profil, tes offres, tes candidatures.",
  aggregate:
    "Je ne partage pas de chiffres globaux sur les candidatures. Dis-moi plutôt où tu en es, toi, et je regarde ça avec toi.",
  third:
    "Désolée, je ne peux pas te communiquer les données personnelles de quelqu'un d'autre — c'est confidentiel. Pour toi par contre, je suis là.",
}

// ── P1 — petites interactions (réponse directe, sans outil), 1er tour ────────
// On détecte le DÉBUT (salutation/remerciement…) et on n'intercepte que s'il n'y a
// AUCUNE intention actionnable dans le message (« Salut, trouve-moi un stage » passe à l'agent).

const RE_START_GREETING = /^(bonjour|bonsoir|salut|coucou|cc|hello|hey|yaye)/
const RE_START_THANKS = /^(merci|thanks?|nickel|super|top|parfait|genial)/
const RE_START_BYE = /^(au\s*revoir|a\s*bientot|bye|ciao|a\s*\+|bonne\s+(journee|soiree|continuation)|ba\s+beneen)/
const RE_START_SMALLTALK = /^(ca\s+va|comment\s+(tu\s+)?vas|tu\s+vas\s+bien|comment\s+ca\s+va|ca\s+roule)/
const RE_HAS_ACTION =
  /(offre|stage|emploi|boulot|travail|bourse|financement|volontariat|formation|reserv|salle|vehicule|badge|carte|livre|emprunt|biblio|candidat|postul|cherch|trouv|profil|competenc|conseil|besoin|aide[- ]moi|eligib|manque)/

// Sous-ensemble « TÂCHE outil » (≠ demande de conseil) : sert à ne PAS court-circuiter
// les pré-screens émotionnels quand la personne demande AUSSI une action concrète
// (« je stresse pour l'entretien, prépare ma candidature »). Exclut volontairement
// `conseil`/`aide` qui, eux, sont le déclencheur légitime de l'encouragement direct.
const RE_TOOL_ACTION =
  /(offre|stage|emploi|boulot|bourse|financement|volontariat|formation|reserv|salle|vehicule|badge|emprunt|biblio|candidat|postul|cherch|trouv|eligib)/

const GREETINGS = [
  "Bonjour ! Dis-moi ce qui t'amène — une opportunité, une formation, ou un point sur tes candidatures ?",
  "Salut ! Qu'est-ce que je peux faire pour toi aujourd'hui : chercher une offre, réserver une salle, ou autre ?",
  "Coucou ! On regarde quoi ensemble — un emploi, un stage, une bourse ?",
  "Ravie de te voir ! Tu cherches une offre, une formation, ou tu veux suivre tes démarches ?",
  "Hello ! Par quoi on commence — une recherche d'opportunité, ton badge, ou tes candidatures ?",
  "Hey ! Content de te retrouver. Tu veux qu'on cherche une offre ou qu'on regarde ton profil ?",
  "Bonjour à toi ! Un projet en tête — emploi, stage, formation ? Je t'écoute.",
  "Salut ! Prêt·e à avancer ? Dis-moi si c'est une offre, une réservation ou tes candidatures.",
  "Coucou ! Raconte-moi ce dont tu as besoin, on trouve ça ensemble.",
  "Ravie de t'avoir ! On attaque par quoi — une opportunité près de chez toi, ou une formation ?",
]
const THANKS = [
  "Avec plaisir ! Je reste là si tu as besoin d'autre chose.",
  "De rien ! Dis-moi si je peux t'aider sur autre chose.",
  "Trop content d'avoir pu aider ! On continue quand tu veux.",
]
const BYES = [
  "À bientôt ! Reviens quand tu veux, je suis là.",
  "Bonne continuation ! Je reste dispo dès que tu as besoin.",
  "Prends soin de toi ! On se retrouve quand tu veux.",
]
const SMALLTALK = [
  "Ça va bien, merci ! Et toi, on avance sur quoi aujourd'hui ?",
  "Tout roule de mon côté ! Dis-moi ce qui t'amène.",
  "Bien, merci de demander ! Tu cherches une offre, une formation ?",
]

// Présentation de soi (« qui es-tu / présente-toi / tu sers à quoi ») → réponse TEXTE, sans outil.
const RE_SELF_PRESENT = /^(qui\s+es-?\s*tu|tu\s+es\s+qui|presente[-\s]?toi|parle[-\s]?moi\s+de\s+toi|raconte[-\s]?toi|tu\s+sers\s+a\s+quoi|tu\s+fais\s+quoi|que\s+(peux|sais)-?\s*tu\s+faire|qu'?est-?\s*ce\s+que\s+tu\s+(peux|sais)\s+faire|c'?est\s+quoi\s+yaye|comment\s+tu\s+m'?aides?)\b/
const PRESENTATIONS = [
  "Moi c'est Yaye, ta conseillère du Guichet Jeunesse du CJS. Je te trouve des offres et des formations, je suis tes candidatures et t'aide à postuler, je réserve une salle, sors ton badge ou te déniche un livre. On commence par quoi ?",
  "Je suis Yaye, du CJS. Je t'accompagne côté opportunités (emploi, stage, bourse), formations, candidatures, réservations et badge. Dis-moi ce dont tu as besoin !",
  "Yaye, ta grande sœur numérique du CJS. Je cherche offres et formations pour toi, je suis tes démarches, je te réserve une salle ou sors ton badge. Par quoi on attaque ?",
]

// Message PUREMENT vague (« aide-moi », « je sais pas quoi faire ») → UNE question de
// clarification, sans outil (au lieu de deviner un outil ou d'escalader). Ancré : ne matche
// QUE le message isolé — « aide-moi à trouver un stage » a une intention → laissé à l'agent.
const RE_VAGUE = /^(aide-?\s*moi|aide|au\s+secours|je\s+(ne\s+)?sais\s+pas\s+(trop\s+)?(quoi\s+faire)?|help)\s*[!.?…]*$/
const CLARIFY = [
  "Je suis là pour ça ! Dis-moi : tu cherches plutôt un emploi, une formation, ou un coup de main sur tes démarches ?",
  "Avec plaisir ! Tu penses à quoi — une offre, une réservation au centre, ou ton badge ?",
  "On va trouver ensemble ! C'est côté boulot, études, ou autre chose ?",
]

// Hors-périmètre évident (météo, sport, actu, recette…) → recadrage chaleureux, sans outil.
const RE_OFFTOPIC = /(quel\s+temps|la\s+meteo|il\s+va\s+(pleuvoir|faire\s+beau)|resultat\s+(du\s+)?match|score\s+du\s+match|qui\s+a\s+gagne\s+le\s+match|recette\s+(de|pour)|comment\s+cuisiner|raconte(-moi)?\s+une\s+blague|capitale\s+d[eu]|qui\s+est\s+le\s+president|les\s+actualites|les\s+news)/
const OFFTOPIC = [
  "Ça, ce n'est pas trop mon domaine ! Par contre, pour une offre, une formation ou tes démarches au CJS, je suis là. Je te cherche quelque chose ?",
  "Je ne saurais pas t'aider là-dessus, désolée. Mais côté opportunités, formations ou candidatures, dis-moi tout !",
]

// Revers LÉGER (échec/déception ponctuelle) SANS signal de danger → consolation + rebond,
// JAMAIS d'escalade. Corrige la sur-escalade des petits modèles (« j'ai raté mon concours »
// escaladé comme un danger). Le danger réel est déjà intercepté plus haut ; ce garde-fou ne
// voit donc que des revers ordinaires, et seulement sans intention actionnable.
const RE_MILD_SETBACK =
  /(rate|ratee|echoue|echouee|recale|recalee|loupe|loupee|foire|pas\s+eu|pas\s+reussi|pas\s+ete\s+pris)\b.{0,30}(concours|examen|entretien|test|selection|oral|ecrit)|j'?ai\s+(rate|echoue|loupe|foire)\b|je\s+suis\s+(un\s+peu\s+)?(decu|decue|degoute|degoutee|triste|decourage|decouragee|demoralise|demoralisee)\b/
const CONSOLATIONS = [
  "Ah, je comprends que ce soit décevant — mais ce n'est pas la fin du parcours. Si tu veux, on regarde d'autres pistes ou une formation pour rebondir ?",
  "C'est dur sur le moment, mais un revers n'efface pas ton potentiel. On cherche ensemble une nouvelle opportunité quand tu veux.",
  "Courage, ça arrive et ça ne dit rien de ta valeur. Dis-moi si tu veux qu'on trouve une autre voie ou une formation pour repartir.",
]

// Trac / stress AVANT un entretien-examen (émotion ordinaire) → encouragement + conseils directs,
// JAMAIS une escalade conseiller. Répond à la demande (« des conseils ? ») sans outil ni escalade.
const RE_ANXIETY = /(stress|trac|anxieu|angois|nerveu|panic|panique|flippe|apprehend|apprehende|pas\s+confiance).{0,30}(entretien|examen|oral|ecrit|concours|test|presentation|rendez-vous|rdv|soutenance)/
const ADVICE = [
  "C'est normal d'avoir le trac ! Prépare 2-3 exemples concrets de tes expériences, entraîne-toi à voix haute, et arrive un peu en avance. Tu veux qu'on prépare tes réponses ensemble ?",
  "Respire, ce stress montre juste que ça compte pour toi. Relis l'offre, prépare une question à poser, et repère bien le lieu à l'avance. Je peux t'aider à t'entraîner si tu veux.",
  "Le trac, tout le monde connaît ! Mets en avant 2-3 forces, prépare une réponse à « parlez-moi de vous », et dors bien avant. On peut réviser tes points forts ensemble si tu veux.",
]

/** Choix varié SANS aléa : rotation déterministe par pool (évite les doublons de l'aléatoire). */
const _cursor = new WeakMap<string[], number>()
function pick(pool: string[]): string {
  const i = _cursor.get(pool) ?? 0
  _cursor.set(pool, (i + 1) % pool.length)
  return pool[i]
}

/**
 * Filtre un message AVANT la boucle d'outils.
 * @param firstTurn true si aucun historique (les petites interactions ne s'appliquent qu'au 1er tour).
 * @returns une réponse à court-circuiter, ou null pour laisser passer à l'agent.
 */
export function preScreen(message: string, firstTurn = true): PreScreenResult | null {
  const t = norm(message)

  // DANGER — priorité absolue : force l'escalade humaine (filet de sécurité).
  const danger = detectDanger(message)
  if (danger) return { action: 'escalate', reply: DANGER_REPLY, reason: `danger:${danger}`, dangerSignal: danger }

  // P0 — sécurité (ordre : injection > export massif > agrégat > tiers).
  if (RE_INJECTION.test(t)) return { action: 'refuse', reply: REFUSALS.injection, reason: 'injection' }
  if (RE_MASS_EXPORT.test(t)) return { action: 'refuse', reply: REFUSALS.mass, reason: 'mass_export' }
  if (RE_AGGREGATE.test(t)) return { action: 'refuse', reply: REFUSALS.aggregate, reason: 'aggregate' }
  if (RE_THIRD_NAMED.test(message) || RE_THIRD_CONTACT.test(t) || (RE_THIRD_PERSON.test(t) && RE_DATA_CARRIER.test(t))) {
    return { action: 'refuse', reply: REFUSALS.third, reason: 'third_party' }
  }

  // Demande explicite d'un conseiller humain → escalade (relais dû, jamais un refus).
  if (RE_HUMAN_REQUEST.test(t)) return { action: 'escalate', reply: HUMAN_REPLY, reason: 'human_request' }

  // Trac avant un entretien/examen → encouragement + conseils directs (jamais d'escalade).
  // Placé avant le revers car « je stresse … tu as des conseils ? » porte une intention actionnable.
  // Mais si une TÂCHE outil est aussi demandée (« … prépare ma candidature »), on laisse l'agent
  // agir plutôt que de servir un conseil tout fait qui l'ignorerait.
  if (RE_ANXIETY.test(t) && !RE_TOOL_ACTION.test(t)) return { action: 'direct', reply: pick(ADVICE), reason: 'anxiety' }
  // Revers ordinaire sans intention actionnable → consolation directe (anti sur-escalade).
  if (RE_MILD_SETBACK.test(t) && !RE_HAS_ACTION.test(t)) return { action: 'direct', reply: pick(CONSOLATIONS), reason: 'setback' }

  // Présentation de soi + hors-sujet évident → réponse directe (tout tour, sans outil).
  // Gardé par !RE_HAS_ACTION : « tu fais quoi comme recherche pour les bourses ? » porte
  // une vraie demande → à l'agent, pas à la présentation figée.
  if (RE_SELF_PRESENT.test(t) && !RE_HAS_ACTION.test(t)) return { action: 'direct', reply: pick(PRESENTATIONS), reason: 'presentation' }
  if (RE_OFFTOPIC.test(t) && !RE_HAS_ACTION.test(t)) return { action: 'direct', reply: pick(OFFTOPIC), reason: 'offtopic' }
  // Message purement vague (1er tour) → question de clarification, sans outil.
  if (firstTurn && RE_VAGUE.test(t)) return { action: 'direct', reply: pick(CLARIFY), reason: 'clarify' }

  // P1 — petites interactions PUREMENT sociales (sans intention actionnable), à TOUT tour.
  // Gardées déterministes même en cours de conversation : un simple « bonjour » / « merci »
  // ne doit jamais partir vers le LLM (un petit modèle y répond souvent à côté — présentation
  // hors-sujet, méta…). La reformulation reste variée via la rotation `pick`.
  if (!RE_HAS_ACTION.test(t)) {
    if (RE_START_GREETING.test(t)) return { action: 'direct', reply: pick(GREETINGS), reason: 'greeting' }
    if (RE_START_THANKS.test(t)) return { action: 'direct', reply: pick(THANKS), reason: 'thanks' }
    if (RE_START_BYE.test(t)) return { action: 'direct', reply: pick(BYES), reason: 'bye' }
    if (RE_START_SMALLTALK.test(t)) return { action: 'direct', reply: pick(SMALLTALK), reason: 'smalltalk' }
  }

  return null
}
