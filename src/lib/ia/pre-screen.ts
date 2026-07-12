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
  /** Réponse à renvoyer telle quelle (tutoyée, courte, sans emoji). */
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
    .replace(/[̀-ͯ]/g, '')
    .replace(/[''´`]/g, "'") // apostrophes courbes → droite (robustesse des motifs)
}

// ── DANGER — filet de sécurité déterministe (priorité ABSOLUE) ────────────────
// Détecte des formulations de danger EXPLICITES pour garantir l'escalade humaine même
// si le modèle passe à côté. Volontairement HAUTE PRÉCISION (phrases nettes) : on préfère
// rater une tournure ambiguë (le modèle reste le 1er filet) que sur-signaler à tort.
// Politique CDP : « en cas de doute, signale » — mais ici on borne pour éviter le bruit.

const DANGER_PATTERNS: readonly (readonly [RegExp, DangerSignal])[] = [
  [/(me\s+suicider|me\s+tuer|mettre\s+fin\s+a\s+mes\s+jours|je\s+veux\s+mourir|veux\s+en\s+finir|envie\s+d'?en\s+finir|en\s+finir\s+avec\s+(la\s+vie|tout)|plus\s+envie\s+de\s+vivre|disparaitre|me\s+faire\s+du\s+mal|m'?automutil|me\s+mutiler|me\s+scarifi)/, 'automutilation_suicide'],
  [/((on|il|elle|mon\s+(mari|conjoint|copain|pere|frere|patron))\s+me\s+(frappe|bat|cogne|roue\s+de\s+coups|tabasse)|je\s+suis\s+(frappe|battu|tabasse)|violences?\s+(conjugal|domestique|familial|a\s+la\s+maison))/, 'violence'],
  [/(attouchement|abus\s+sexuel|on\s+m'?a\s+viol|je\s+me\s+suis\s+fait\s+viol|forc[e]*e?\s+a\s+des\s+(rapport|relation|acte)s?\s+sexuel|rapport\s+sexuel\s+sous\s+contrainte|photos?\s+intimes?\s+sous\s+(la\s+)?contrainte)/, 'abus_sexuel'],
  [/(harcele|cyberharcel)/, 'harcelement'],
  [/(travail\s+force|papiers?[^.]{0,15}confisqu|confisqu[^.]{0,15}(mes\s+)?papiers|fait\s+travailler\s+sans\s+(me\s+)?payer|on\s+me\s+force\s+a\s+travailler|mendicite\s+forcee|je\s+suis\s+exploite\s+au\s+travail)/, 'exploitation'],
]

/** Détecte un signal de danger explicite dans le message, ou null. */
export function detectDanger(message: string): DangerSignal | null {
  const t = norm(message)
  for (const [re, sig] of DANGER_PATTERNS) if (re.test(t)) return sig
  return null
}

const DANGER_REPLY =
  "Merci de m'en avoir parlé, tu as bien fait. Je transmets tout de suite à une personne de confiance du CJS qui va te recontacter — tu n'es pas seul·e."

// ── P0 — refus de sécurité / CDP / injection ─────────────────────────────────

const RE_INJECTION =
  /(ignore[rz]?\b[^.!?]{0,30}(instructions?|regles?|consignes)|oublie[rz]?\b[^.!?]{0,20}instructions?|mode\s+admin|administrateur|tu\s+es\s+(maintenant|desormais)|repete[rz]?\b[^.!?]{0,30}(instructions?|prompt|regles?|consignes)|instructions?\s+system|system\s+prompt|montre[rz]?\b[^.!?]{0,15}(regles?|instructions?|consignes))/

const RE_MASS_EXPORT =
  /(tous?\s+les\s+(utilisateurs?|candidats?|jeunes|membres|inscrits|dossiers?)|toute\s+la\s+base|liste\s+(complete|de\s+tous)|exporte[rz]?\s|extraire?\s+toutes|toutes\s+les\s+(candidatures|donnees|coordonnees))/

const RE_AGGREGATE =
  /(combien\s+(de\s+)?(jeunes|personnes|candidats?|utilisateurs?|gens|inscrits)|nombre\s+(total|de\s+jeunes|de\s+candidat)|au\s+total|en\s+moyenne|moyenne\s+de|statistiques?|taux\s+de|combien\s+ont\s+postule)/

// Donnée d'un tiers : personne explicite, « … de <Prénom> » (majuscule), ou coordonnées
// d'un recruteur/employeur/organisation (Yaye ne divulgue pas de contacts directs).
const RE_THIRD_PERSON =
  /(voisin|voisine|ami|amie|copain|copine|camarade|collegue|quelqu'?un\s+d'?autre|une\s+autre\s+personne)/
const RE_THIRD_NAMED =
  /(candidatures?|dossier|profil|numero|telephone|email|e-?mail|coordonnees|donnees|adresse)\s+(de\s+|d'\s*)[A-ZÉÈ][a-zà-ÿ]+/
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

const RE_START_GREETING = /^(bonjour|bonsoir|salut|coucou|cc|hello|hey|yaye|salam|asalamu|nanga\s*def)/
const RE_START_THANKS = /^(merci|thanks?|jerejef|nickel|super|top|parfait|genial)/
const RE_START_BYE = /^(au\s*revoir|a\s*bientot|bye|ciao|a\s*\+|bonne\s+(journee|soiree|continuation)|ba\s+beneen)/
const RE_START_SMALLTALK = /^(ca\s+va|comment\s+(tu\s+)?vas|tu\s+vas\s+bien|comment\s+ca\s+va|ca\s+roule)/
const RE_HAS_ACTION =
  /(offre|stage|emploi|boulot|travail|bourse|financement|volontariat|formation|reserv|salle|vehicule|badge|carte|livre|emprunt|biblio|candidat|postul|cherch|trouv|profil|competenc|conseil|besoin|aide[- ]moi|eligib|manque)/

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

/** Choix varié sans dépendance externe (évite deux réponses identiques d'affilée). */
function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]
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
  if (RE_THIRD_PERSON.test(t) || RE_THIRD_NAMED.test(message) || RE_THIRD_CONTACT.test(t)) {
    return { action: 'refuse', reply: REFUSALS.third, reason: 'third_party' }
  }

  // P1 — petites interactions (1er tour uniquement, et seulement sans intention actionnable).
  if (firstTurn && !RE_HAS_ACTION.test(t)) {
    if (RE_START_GREETING.test(t)) return { action: 'direct', reply: pick(GREETINGS), reason: 'greeting' }
    if (RE_START_THANKS.test(t)) return { action: 'direct', reply: pick(THANKS), reason: 'thanks' }
    if (RE_START_BYE.test(t)) return { action: 'direct', reply: pick(BYES), reason: 'bye' }
    if (RE_START_SMALLTALK.test(t)) return { action: 'direct', reply: pick(SMALLTALK), reason: 'smalltalk' }
  }

  return null
}
